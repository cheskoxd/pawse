importScripts("lib/domain-utils.js");

const {
  addCoveredDomain,
  normalizeDomainInput,
  removeDomain,
  removeOverlaps,
} = PawseDomainUtils;

const DEFAULT_SETTINGS = Object.freeze({
  protectionEnabled: true,
  strictEnabled: false,
  animalTheme: "mix",
  showMessages: true,
  colorTheme: "system",
});

const DOMAIN_PREFIXES = Object.freeze({
  block: "pawse.domain.block.",
  allow: "pawse.domain.allow.",
});
const RULESET_IDS = Object.freeze({ core: "core", strict: "strict" });
const DYNAMIC_RULE_IDS = Object.freeze({ allow: 910001, customBlock: 910002 });
const RULE_SETTING_KEYS = new Set(["protectionEnabled", "strictEnabled"]);
const SETTABLE_KEYS = new Set([
  "protectionEnabled",
  "strictEnabled",
  "animalTheme",
  "showMessages",
  "colorTheme",
]);

let ruleSync = Promise.resolve();

function domainStorageKey(kind, domain) {
  return `${DOMAIN_PREFIXES[kind]}${encodeURIComponent(domain)}`;
}

function readStoredDomains(stored, kind) {
  return Object.keys(stored)
    .filter((key) => key.startsWith(DOMAIN_PREFIXES[kind]) && stored[key] === true)
    .map((key) => decodeURIComponent(key.slice(DOMAIN_PREFIXES[kind].length)))
    .sort();
}

function isRuleStorageKey(key) {
  return (
    RULE_SETTING_KEYS.has(key) ||
    key.startsWith(DOMAIN_PREFIXES.block) ||
    key.startsWith(DOMAIN_PREFIXES.allow)
  );
}

async function ensureDefaults() {
  const current = await chrome.storage.local.get(null);
  const valuesToSet = {};
  const keysToRemove = [];

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (current[key] === undefined) {
      valuesToSet[key] = value;
    }
  }

  for (const [legacyKey, kind] of [
    ["customBlocked", "block"],
    ["allowedDomains", "allow"],
  ]) {
    if (Array.isArray(current[legacyKey])) {
      for (const domain of current[legacyKey]) {
        valuesToSet[domainStorageKey(kind, domain)] = true;
      }
      keysToRemove.push(legacyKey);
    }
  }

  if (current.blockedCount !== undefined) {
    keysToRemove.push("blockedCount");
  }

  if (Object.keys(valuesToSet).length) {
    await chrome.storage.local.set(valuesToSet);
  }
  if (keysToRemove.length) {
    await chrome.storage.local.remove(keysToRemove);
  }
}

async function getSettings() {
  const stored = await chrome.storage.local.get(null);
  return {
    protectionEnabled:
      stored.protectionEnabled ?? DEFAULT_SETTINGS.protectionEnabled,
    strictEnabled: stored.strictEnabled ?? DEFAULT_SETTINGS.strictEnabled,
    animalTheme: stored.animalTheme ?? DEFAULT_SETTINGS.animalTheme,
    showMessages: stored.showMessages ?? DEFAULT_SETTINGS.showMessages,
    colorTheme: stored.colorTheme ?? DEFAULT_SETTINGS.colorTheme,
    customBlocked: readStoredDomains(stored, "block"),
    allowedDomains: readStoredDomains(stored, "allow"),
  };
}

async function writeDomainList(kind, before, after) {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const valuesToSet = {};
  const keysToRemove = [];

  for (const domain of afterSet) {
    if (!beforeSet.has(domain)) {
      valuesToSet[domainStorageKey(kind, domain)] = true;
    }
  }

  for (const domain of beforeSet) {
    if (!afterSet.has(domain)) {
      keysToRemove.push(domainStorageKey(kind, domain));
    }
  }

  if (Object.keys(valuesToSet).length) {
    await chrome.storage.local.set(valuesToSet);
  }
  if (keysToRemove.length) {
    await chrome.storage.local.remove(keysToRemove);
  }
}

async function applyRuleSettings() {
  const settings = await getSettings();
  const enableRulesetIds = [];
  const disableRulesetIds = [];

  if (settings.protectionEnabled) {
    enableRulesetIds.push(RULESET_IDS.core);
    (settings.strictEnabled ? enableRulesetIds : disableRulesetIds).push(
      RULESET_IDS.strict,
    );
  } else {
    disableRulesetIds.push(RULESET_IDS.core, RULESET_IDS.strict);
  }

  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds,
    disableRulesetIds,
  });

  const addRules = [];
  if (settings.protectionEnabled && settings.allowedDomains.length) {
    addRules.push({
      id: DYNAMIC_RULE_IDS.allow,
      priority: 100,
      action: { type: "allow" },
      condition: {
        requestDomains: settings.allowedDomains,
        resourceTypes: ["main_frame"],
      },
    });
  }

  if (settings.protectionEnabled && settings.customBlocked.length) {
    addRules.push({
      id: DYNAMIC_RULE_IDS.customBlock,
      priority: 10,
      action: { type: "block" },
      condition: {
        requestDomains: settings.customBlocked,
        resourceTypes: ["main_frame"],
      },
    });
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: Object.values(DYNAMIC_RULE_IDS),
    addRules,
  });
}

function scheduleRuleSync() {
  const task = ruleSync.catch(() => undefined).then(applyRuleSettings);
  ruleSync = task;
  return task;
}

function scheduleRuleSyncSilently() {
  scheduleRuleSync().catch((error) =>
    console.error("Pawse could not update its rules.", error),
  );
}

async function restoreDomainLists(previous, changed) {
  await writeDomainList(
    "block",
    changed.customBlocked,
    previous.customBlocked,
  );
  await writeDomainList(
    "allow",
    changed.allowedDomains,
    previous.allowedDomains,
  );
  await scheduleRuleSync();
}

async function setDomain(kind, value) {
  const domain = normalizeDomainInput(value);
  const previous = await getSettings();
  const changed = {
    customBlocked: previous.customBlocked,
    allowedDomains: previous.allowedDomains,
  };

  if (kind === "block") {
    changed.customBlocked = addCoveredDomain(previous.customBlocked, domain);
    changed.allowedDomains = removeOverlaps(previous.allowedDomains, domain);
  } else if (kind === "allow") {
    changed.allowedDomains = addCoveredDomain(previous.allowedDomains, domain);
  } else {
    throw new Error("Unknown list type.");
  }

  await writeDomainList("block", previous.customBlocked, changed.customBlocked);
  await writeDomainList("allow", previous.allowedDomains, changed.allowedDomains);

  try {
    await scheduleRuleSync();
  } catch {
    try {
      await restoreDomainLists(previous, changed);
    } catch (repairError) {
      console.error("Pawse could not restore its previous rules.", repairError);
      throw new Error(
        "Chrome could not update or restore the blocking rules. Reload Pawse from chrome://extensions before browsing.",
      );
    }
    throw new Error(
      "Chrome could not update the blocking rules. Your previous lists were restored.",
    );
  }

  return { domain, settings: await getSettings() };
}

async function deleteDomain(kind, value) {
  const domain = normalizeDomainInput(value);
  const previous = await getSettings();
  const field = kind === "block" ? "customBlocked" : "allowedDomains";
  const changedList = removeDomain(previous[field], domain);

  await writeDomainList(kind, previous[field], changedList);

  try {
    await scheduleRuleSync();
  } catch {
    try {
      await writeDomainList(kind, changedList, previous[field]);
      await scheduleRuleSync();
    } catch (repairError) {
      console.error("Pawse could not restore its previous rules.", repairError);
      throw new Error(
        "Chrome could not update or restore the blocking rules. Reload Pawse from chrome://extensions before browsing.",
      );
    }
    throw new Error(
      "Chrome could not update the blocking rules. The site was kept on your list.",
    );
  }

  return { settings: await getSettings() };
}

async function setSetting(key, value) {
  if (!SETTABLE_KEYS.has(key)) {
    throw new Error("That setting cannot be changed here.");
  }

  if (
    (["protectionEnabled", "strictEnabled", "showMessages"].includes(key) &&
      typeof value !== "boolean") ||
    (key === "animalTheme" && !["mix", "cats", "dogs"].includes(value)) ||
    (key === "colorTheme" && !["system", "light", "dark"].includes(value))
  ) {
    throw new Error("That setting value is not valid.");
  }

  const previous = await getSettings();
  await chrome.storage.local.set({ [key]: value });

  if (RULE_SETTING_KEYS.has(key)) {
    try {
      await scheduleRuleSync();
    } catch {
      try {
        await chrome.storage.local.set({ [key]: previous[key] });
        await scheduleRuleSync();
      } catch (repairError) {
        console.error("Pawse could not restore its previous rules.", repairError);
        throw new Error(
          "Chrome could not update or restore the blocking rules. Reload Pawse from chrome://extensions before browsing.",
        );
      }
      throw new Error(
        "Chrome could not update the blocking rules. The previous setting was restored.",
      );
    }
  }

  return { settings: await getSettings() };
}

async function handleMessage(message) {
  switch (message?.type) {
    case "pawse:get-state":
      return { settings: await getSettings() };
    case "pawse:set-setting":
      return setSetting(message.key, message.value);
    case "pawse:add-domain":
      return setDomain(message.kind, message.value);
    case "pawse:remove-domain":
      return deleteDomain(message.kind, message.value);
    default:
      throw new Error("Unknown Pawse request.");
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});

async function initializeRules() {
  try {
    await ensureDefaults();
    await scheduleRuleSync();
  } catch (error) {
    console.error("Pawse could not initialize its rules.", error);
  }
}

chrome.runtime.onInstalled.addListener(initializeRules);
chrome.runtime.onStartup.addListener(initializeRules);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (
    areaName === "local" &&
    Object.keys(changes).some((key) => isRuleStorageKey(key))
  ) {
    scheduleRuleSyncSilently();
  }
});

initializeRules();
