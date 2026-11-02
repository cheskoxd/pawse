const { normalizeDomainInput } = PawseDomainUtils;

const controls = {
  protection: document.querySelector("#protection-enabled"),
  strict: document.querySelector("#strict-enabled"),
  messages: document.querySelector("#show-messages"),
  colorThemes: document.querySelectorAll('input[name="color-theme"]'),
  blockedList: document.querySelector("#blocked-list"),
  blockedEmpty: document.querySelector("#blocked-empty"),
  allowedList: document.querySelector("#allowed-list"),
  allowedEmpty: document.querySelector("#allowed-empty"),
  status: document.querySelector("#save-status"),
};

let state;
let statusTimer;

async function ask(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) {
    throw new Error(response?.error || "Pawse could not finish that action.");
  }
  return response;
}

function setStatus(message, isError = false) {
  window.clearTimeout(statusTimer);
  controls.status.textContent = message;
  controls.status.classList.toggle("is-error", isError);
  statusTimer = window.setTimeout(() => {
    controls.status.textContent = "";
    controls.status.classList.remove("is-error");
  }, 4000);
}

function createDomainItem(domain, kind) {
  const item = document.createElement("li");
  const label = document.createElement("span");
  const button = document.createElement("button");

  label.textContent = domain;
  label.title = domain;
  button.type = "button";
  button.textContent = "Remove";
  button.setAttribute("aria-label", `Remove ${domain}`);
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      const response = await ask({
        type: "pawse:remove-domain",
        kind,
        value: domain,
      });
      state = response.settings;
      render();
      setStatus(`${domain} removed.`);
      document
        .querySelector(`.domain-form[data-kind="${kind}"] input[name="domain"]`)
        .focus();
    } catch (error) {
      button.disabled = false;
      setStatus(error.message, true);
    }
  });

  item.append(label, button);
  return item;
}

function renderDomainList(domains, list, empty, kind) {
  list.replaceChildren(...domains.map((domain) => createDomainItem(domain, kind)));
  empty.hidden = domains.length > 0;
}

function render() {
  PawseTheme.applyTheme(state.colorTheme);
  controls.protection.checked = state.protectionEnabled;
  controls.strict.checked = state.strictEnabled;
  controls.strict.disabled = !state.protectionEnabled;
  controls.messages.checked = state.showMessages;

  const selectedTheme = document.querySelector(
    `input[name="animal-theme"][value="${state.animalTheme}"]`,
  );
  if (selectedTheme) selectedTheme.checked = true;

  const selectedColorTheme = document.querySelector(
    `input[name="color-theme"][value="${state.colorTheme}"]`,
  );
  if (selectedColorTheme) selectedColorTheme.checked = true;

  renderDomainList(
    state.customBlocked,
    controls.blockedList,
    controls.blockedEmpty,
    "block",
  );
  renderDomainList(
    state.allowedDomains,
    controls.allowedList,
    controls.allowedEmpty,
    "allow",
  );
}

async function changeSetting(key, value, successMessage) {
  try {
    const response = await ask({
      type: "pawse:set-setting",
      key,
      value,
    });
    state = response.settings;
    render();
    setStatus(successMessage);
  } catch (error) {
    render();
    setStatus(error.message, true);
  }
}

controls.protection.addEventListener("change", () => {
  changeSetting(
    "protectionEnabled",
    controls.protection.checked,
    controls.protection.checked ? "Blocking turned on." : "Blocking turned off.",
  );
});

controls.strict.addEventListener("change", () => {
  changeSetting(
    "strictEnabled",
    controls.strict.checked,
    controls.strict.checked ? "Strict matching turned on." : "Strict matching turned off.",
  );
});

controls.messages.addEventListener("change", () => {
  changeSetting(
    "showMessages",
    controls.messages.checked,
    "Blocked-page messages updated.",
  );
});

for (const radio of document.querySelectorAll('input[name="animal-theme"]')) {
  radio.addEventListener("change", () => {
    if (radio.checked) {
      changeSetting("animalTheme", radio.value, "Animal choice updated.");
    }
  });
}

for (const radio of controls.colorThemes) {
  radio.addEventListener("change", () => {
    if (radio.checked) {
      PawseTheme.applyTheme(radio.value);
      changeSetting("colorTheme", radio.value, "Appearance updated.");
    }
  });
}

for (const form of document.querySelectorAll(".domain-form")) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = form.elements.domain;
    const errorElement = form.querySelector(".form-error");
    const kind = form.dataset.kind;
    let domain;

    input.removeAttribute("aria-invalid");
    errorElement.textContent = "";

    try {
      domain = normalizeDomainInput(input.value);
    } catch (error) {
      input.setAttribute("aria-invalid", "true");
      errorElement.textContent = error.message;
      input.focus();
      return;
    }

    try {
      const response = await ask({
        type: "pawse:add-domain",
        kind,
        value: domain,
      });
      state = response.settings;
      input.value = "";
      render();
      setStatus(`${domain} added to the ${kind === "block" ? "blocklist" : "allowlist"}.`);
    } catch (error) {
      setStatus(error.message, true);
    }
  });
}

async function initialize() {
  try {
    const response = await ask({ type: "pawse:get-state" });
    state = response.settings;
    render();
  } catch (error) {
    setStatus(error.message, true);
  }
}

initialize();
