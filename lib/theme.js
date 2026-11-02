(function attachTheme(root) {
  "use strict";

  const THEMES = new Set(["system", "light", "dark"]);
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  let selectedTheme = "system";

  function applyTheme(theme) {
    selectedTheme = THEMES.has(theme) ? theme : "system";
    const resolvedTheme =
      selectedTheme === "system"
        ? systemTheme.matches
          ? "dark"
          : "light"
        : selectedTheme;

    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }

  systemTheme.addEventListener("change", () => {
    if (selectedTheme === "system") applyTheme("system");
  });

  if (globalThis.chrome?.storage?.local) {
    chrome.storage.local
      .get({ colorTheme: "system" })
      .then(({ colorTheme }) => applyTheme(colorTheme))
      .catch(() => applyTheme("system"));

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && changes.colorTheme) {
        applyTheme(changes.colorTheme.newValue);
      }
    });
  }

  root.PawseTheme = { applyTheme };
  applyTheme("system");
})(globalThis);
