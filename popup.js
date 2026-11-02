const { domainCovers, isHttpUrl, normalizeDomainInput } = PawseDomainUtils;

const toggle = document.querySelector("#protection-toggle");
const statusTitle = document.querySelector("#status-title");
const statusCopy = document.querySelector("#status-copy");
const siteTitle = document.querySelector("#site-title");
const blockSiteButton = document.querySelector("#block-site");
const siteHelper = document.querySelector("#site-helper");
const notice = document.querySelector("#notice");
const statusCard = document.querySelector("#status-card");

let state;
let currentDomain;

async function ask(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) {
    throw new Error(response?.error || "Pawse could not finish that action.");
  }
  return response;
}

function render() {
  PawseTheme.applyTheme(state?.colorTheme || "system");
  const enabled = Boolean(state?.protectionEnabled);
  toggle.checked = enabled;
  statusTitle.textContent = enabled ? "Blocking is on" : "Blocking is off";
  statusCopy.textContent = enabled
    ? "Known and custom sites will be redirected."
    : "Sites will open normally until blocking is turned on.";
  toggle.disabled = false;
  statusCard.setAttribute("aria-busy", "false");

  if (!currentDomain) return;

  const alreadyBlocked = state.customBlocked.some((domain) =>
    domainCovers(domain, currentDomain),
  );
  blockSiteButton.disabled = alreadyBlocked;
  blockSiteButton.textContent = alreadyBlocked
    ? "Already on your list"
    : "Block this website";
  siteHelper.textContent = alreadyBlocked
    ? "You can remove it in Settings."
    : `Adds ${currentDomain} and its subdomains.`;
}

async function loadCurrentSite() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !isHttpUrl(tab.url)) {
    siteTitle.textContent = "This Chrome page cannot be added";
    siteHelper.textContent = "Open a regular website, then try again.";
    return;
  }

  currentDomain = normalizeDomainInput(tab.url);
  siteTitle.textContent = currentDomain;
  blockSiteButton.disabled = false;
}

async function initialize() {
  try {
    const response = await ask({ type: "pawse:get-state" });
    state = response.settings;
    await loadCurrentSite();
    render();
  } catch (error) {
    statusTitle.textContent = "Status unavailable";
    statusCopy.textContent = "Open Settings and try again.";
    statusCard.setAttribute("aria-busy", "false");
    notice.textContent = error.message;
  }
}

toggle.addEventListener("change", async () => {
  toggle.disabled = true;
  try {
    const response = await ask({
      type: "pawse:set-setting",
      key: "protectionEnabled",
      value: toggle.checked,
    });
    state = response.settings;
    notice.textContent = toggle.checked ? "Blocking turned on." : "Blocking turned off.";
    render();
  } catch (error) {
    notice.textContent = error.message;
    toggle.checked = !toggle.checked;
  } finally {
    toggle.disabled = false;
  }
});

blockSiteButton.addEventListener("click", async () => {
  if (!currentDomain) return;
  blockSiteButton.disabled = true;
  try {
    const response = await ask({
      type: "pawse:add-domain",
      kind: "block",
      value: currentDomain,
    });
    state = response.settings;
    notice.textContent = `${currentDomain} is now blocked.`;
    render();
  } catch (error) {
    notice.textContent = error.message;
    blockSiteButton.disabled = false;
  }
});

document.querySelector("#open-settings").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

initialize();
