const ART = Object.freeze({
  cats: {
    src: "assets/cat-detour.webp",
    alt: "A sleepy orange cat stretched across a computer keyboard.",
    caption: "Request reviewed. Cat says no.",
  },
  dogs: {
    src: "assets/dog-detour.webp",
    alt: "A cheerful dog carrying a blank browser tab card away.",
    caption: "This dog brought you a blank tab.",
  },
});

const MESSAGES = Object.freeze([
  "No lecture. Just a quieter tab.",
  "This page can wait.",
  "Take a moment. The next click is yours.",
  "One small detour. Take your time.",
  "Your tiny tab host is on duty.",
  "A blank tab is one click away.",
]);

const artElement = document.querySelector("#animal-art");
const captionElement = document.querySelector("#art-caption");
const messageElement = document.querySelector("#message");
const anotherButton = document.querySelector("#show-another");
const detourStatus = document.querySelector("#detour-status");

let settings = {
  animalTheme: "mix",
  showMessages: true,
  colorTheme: "system",
};
let artIndex = Math.random() < 0.5 ? 0 : 1;
let messageIndex = Math.floor(Math.random() * MESSAGES.length);

function availableArt() {
  if (settings.animalTheme === "cats") return [ART.cats];
  if (settings.animalTheme === "dogs") return [ART.dogs];
  return [ART.cats, ART.dogs];
}

function playRefreshAnimation() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  anotherButton.disabled = true;
  const animations = [];

  animations.push(
    artElement.animate(
      [
        { opacity: 0.25, filter: "blur(5px) saturate(0.75)" },
        { opacity: 1, filter: "blur(0) saturate(1)" },
      ],
      {
        duration: 560,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    ),
  );

  animations.push(
    captionElement.animate(
      [
        { opacity: 0, transform: "translateY(12px) scale(0.96)" },
        { opacity: 1, transform: "translateY(0) scale(1)" },
      ],
      {
        duration: 500,
        delay: 100,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "backwards",
      },
    ),
  );

  if (!messageElement.hidden) {
    animations.push(
      messageElement.animate(
        [
          { opacity: 0, transform: "translateX(-10px)" },
          { opacity: 1, transform: "translateX(0)" },
        ],
        {
          duration: 420,
          delay: 80,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "backwards",
        },
      ),
    );
  }

  Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
    anotherButton.disabled = false;
  });
}

function renderDetour(advance = false) {
  const choices = availableArt();
  PawseTheme.applyTheme(settings.colorTheme);
  if (advance) {
    artIndex = (artIndex + 1) % choices.length;
    messageIndex = (messageIndex + 1) % MESSAGES.length;
  }

  const art = choices[artIndex % choices.length];
  artElement.src = art.src;
  artElement.alt = art.alt;
  captionElement.textContent = art.caption;

  messageElement.hidden = !settings.showMessages;
  messageElement.textContent = settings.showMessages ? MESSAGES[messageIndex] : "";
  anotherButton.hidden = choices.length === 1 && !settings.showMessages;
  anotherButton.textContent =
    choices.length > 1 ? "Show another animal" : "Show another message";

  if (advance) {
    const description = [art.alt, art.caption];
    if (settings.showMessages) description.push(MESSAGES[messageIndex]);
    detourStatus.textContent = description.join(" ");
    playRefreshAnimation();
  }
}

async function initialize() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "pawse:get-state" });
    if (response?.ok) {
      settings = { ...settings, ...response.settings };
    }
  } catch {
    // Keep the bundled defaults if storage is unavailable.
  }

  renderDetour();
}

document.querySelector("#go-back").addEventListener("click", () => {
  if (window.history.length > 1) {
    window.history.back();
    window.setTimeout(() => window.location.replace("about:blank"), 700);
  } else {
    window.location.replace("about:blank");
  }
});

document.querySelector("#open-blank").addEventListener("click", () => {
  window.location.replace("about:blank");
});

anotherButton.addEventListener("click", () => renderDetour(true));

renderDetour();
initialize();
