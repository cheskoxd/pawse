const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");

const {
  addCoveredDomain,
  domainCovers,
  isHttpUrl,
  normalizeDomainInput,
  removeOverlaps,
} = require("../lib/domain-utils.js");

const projectRoot = path.resolve(__dirname, "..");

test("normalizes URLs and hostnames without silently broadening them", () => {
  assert.equal(normalizeDomainInput("Example.COM/path?q=1"), "example.com");
  assert.equal(normalizeDomainInput("https://www.example.com/a"), "www.example.com");
  assert.equal(normalizeDomainInput("https://mañana.com"), "xn--maana-pta.com");
});

test("rejects unsupported or dangerously broad input", () => {
  assert.throws(() => normalizeDomainInput(""), /Enter a website/);
  assert.throws(() => normalizeDomainInput("localhost"), /full hostname/);
  assert.throws(() => normalizeDomainInput("*.example.com"), /wildcards/);
  assert.throws(() => normalizeDomainInput("ftp://example.com"), /http and https/);
});

test("matches a domain and its subdomains only", () => {
  assert.equal(domainCovers("example.com", "example.com"), true);
  assert.equal(domainCovers("example.com", "media.example.com"), true);
  assert.equal(domainCovers("example.com", "notexample.com"), false);
});

test("keeps the smallest useful custom-domain set", () => {
  assert.deepEqual(addCoveredDomain(["example.com"], "www.example.com"), [
    "example.com",
  ]);
  assert.deepEqual(
    addCoveredDomain(["a.example.com", "b.example.com"], "example.com"),
    ["example.com"],
  );
});

test("removes contradictory entries from the other list", () => {
  assert.deepEqual(
    removeOverlaps(["example.com", "safe.test"], "www.example.com"),
    ["safe.test"],
  );
});

test("recognizes only normal web URLs", () => {
  assert.equal(isHttpUrl("https://example.com"), true);
  assert.equal(isHttpUrl("chrome://extensions"), false);
  assert.equal(isHttpUrl("not a url"), false);
});

test("manifest and static rule resources are internally consistent", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(projectRoot, "manifest.json"), "utf8"),
  );
  const coreRules = JSON.parse(
    fs.readFileSync(path.join(projectRoot, "rules/core.json"), "utf8"),
  );
  const strictRules = JSON.parse(
    fs.readFileSync(path.join(projectRoot, "rules/strict.json"), "utf8"),
  );

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.minimum_chrome_version, "101");
  assert.ok(manifest.permissions.includes("activeTab"));
  assert.ok(manifest.permissions.includes("declarativeNetRequest"));
  assert.ok(!manifest.permissions.includes("declarativeNetRequestWithHostAccess"));
  assert.equal(
    manifest.declarative_net_request.rule_resources.find(
      (ruleset) => ruleset.id === "strict",
    ).enabled,
    false,
  );
  assert.match(
    manifest.content_security_policy.extension_pages,
    /frame-ancestors 'none'/,
  );

  const coreDomains = coreRules.flatMap(
    (rule) => rule.condition.requestDomains || [],
  );
  const expectedHostPatterns = coreDomains
    .map((domain) => `*://*.${domain}/*`)
    .sort();
  const requiredHostPatterns = [...manifest.host_permissions].sort();
  const webAccessiblePatterns = [
    ...manifest.web_accessible_resources[0].matches,
  ].sort();

  assert.equal(coreDomains.length, 35);
  assert.deepEqual(requiredHostPatterns, expectedHostPatterns);
  assert.deepEqual(webAccessiblePatterns, expectedHostPatterns);

  const forbiddenBroadPatterns = new Set([
    "<all_urls>",
    "*://*/*",
    "http://*/*",
    "https://*/*",
  ]);
  for (const pattern of [
    ...requiredHostPatterns,
    ...webAccessiblePatterns,
    ...(manifest.optional_host_permissions || []),
  ]) {
    assert.ok(!forbiddenBroadPatterns.has(pattern), `Broad pattern found: ${pattern}`);
  }

  for (const rule of coreRules) {
    assert.equal(rule.priority, 20);
    assert.equal(rule.action.type, "redirect");
    assert.equal(rule.action.redirect.extensionPath, "/blocked.html");
  }

  for (const rule of strictRules) {
    assert.equal(rule.priority, 1);
    assert.equal(rule.action.type, "block");
    assert.equal(rule.action.redirect, undefined);
  }

  for (const ruleset of manifest.declarative_net_request.rule_resources) {
    const rules = JSON.parse(
      fs.readFileSync(path.join(projectRoot, ruleset.path), "utf8"),
    );
    assert.ok(rules.length > 0);

    for (const rule of rules) {
      assert.ok(["block", "redirect"].includes(rule.action.type));
      assert.deepEqual(rule.condition.resourceTypes, ["main_frame"]);
      if (rule.condition.regexFilter) {
        assert.doesNotThrow(() => new RegExp(rule.condition.regexFilter, "i"));
      }
    }
  }
});

test("rule priorities preserve allow, bundled redirect, custom block, strict order", () => {
  const coreRules = JSON.parse(
    fs.readFileSync(path.join(projectRoot, "rules/core.json"), "utf8"),
  );
  const strictRules = JSON.parse(
    fs.readFileSync(path.join(projectRoot, "rules/strict.json"), "utf8"),
  );
  const backgroundSource = fs.readFileSync(
    path.join(projectRoot, "background.js"),
    "utf8",
  );

  assert.match(
    backgroundSource,
    /id: DYNAMIC_RULE_IDS\.allow,\s+priority: 100,\s+action: \{ type: "allow" \},/,
  );
  assert.match(
    backgroundSource,
    /id: DYNAMIC_RULE_IDS\.customBlock,\s+priority: 10,\s+action: \{ type: "block" \},/,
  );
  assert.ok(coreRules.every((rule) => rule.priority === 20));
  assert.ok(strictRules.every((rule) => rule.priority === 1));
});

test("strict rules match hostnames but not matching words in paths", () => {
  const rules = JSON.parse(
    fs.readFileSync(path.join(projectRoot, "rules/strict.json"), "utf8"),
  );
  const matches = (url) =>
    rules.some((rule) => new RegExp(rule.condition.regexFilter, "i").test(url));

  assert.equal(matches("https://very-porn-site.example/"), true);
  assert.equal(matches("https://example.porn/"), true);
  assert.equal(matches("https://example.xxx/"), true);
  assert.equal(matches("https://example.com/articles/porn-in-media"), false);
  assert.equal(matches("https://sussex.example/"), false);
});

test("theme helper supports system, light, and dark modes", () => {
  const source = fs.readFileSync(
    path.join(projectRoot, "lib/theme.js"),
    "utf8",
  );
  const mediaListeners = [];
  const context = {
    document: { documentElement: { dataset: {}, style: {} } },
    window: {
      matchMedia: () => ({
        matches: true,
        addEventListener: (_type, listener) => mediaListeners.push(listener),
      }),
    },
  };
  context.globalThis = context;

  vm.runInNewContext(source, context);

  assert.equal(context.document.documentElement.dataset.theme, "dark");
  context.PawseTheme.applyTheme("light");
  assert.equal(context.document.documentElement.dataset.theme, "light");
  context.PawseTheme.applyTheme("dark");
  assert.equal(context.document.documentElement.style.colorScheme, "dark");
  assert.equal(mediaListeners.length, 1);

  for (const page of ["blocked.html", "popup.html", "options.html"]) {
    assert.match(
      fs.readFileSync(path.join(projectRoot, page), "utf8"),
      /lib\/theme\.js/,
    );
  }
});
