const LOCAL_ART = Object.freeze({
  cats: Object.freeze({
    src: "assets/cat-detour.webp",
    alt: "A sleepy orange cat stretched across a computer keyboard.",
    loadingCaption: "Finding a fresh cat. Here’s a local favorite while we look.",
    caption: "Cataas is taking a nap. Here’s a local favorite.",
  }),
  dogs: Object.freeze({
    src: "assets/dog-detour.webp",
    alt: "A cheerful dog carrying a blank browser tab card away.",
    loadingCaption: "Finding a fresh dog. Here’s a local favorite while we look.",
    caption: "The dog service wandered off. Here’s a local favorite.",
  }),
});

const REMOTE_ART = Object.freeze({
  cats: Object.freeze({
    alt: "A random cat from Cataas.",
    caption: "A fresh cat break, courtesy of Cataas.",
  }),
  dogs: Object.freeze({
    alt: "A random dog from Dog CEO.",
    caption: "A fresh dog break, courtesy of Dog CEO.",
  }),
});

const MESSAGES = Object.freeze([
  "No lecture. Just a quieter tab.",
  "This page can wait.",
  "Take a moment. The next click is yours.",
  "One small detour. Take your time.",
  "Your tiny tab host is on duty.",
  "A blank tab is one click away.",
]);

const REQUEST_TIMEOUT_MS = 8000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 24 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const artPanel = document.querySelector("#art-panel");
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
let animalKind = Math.random() < 0.5 ? "cats" : "dogs";
let messageIndex = Math.floor(Math.random() * MESSAGES.length);
let requestSequence = 0;
let activeRequestController;
let activeObjectUrl;

function selectedAnimalKind(advance) {
  if (settings.animalTheme === "cats") return "cats";
  if (settings.animalTheme === "dogs") return "dogs";
  if (advance) return animalKind === "cats" ? "dogs" : "cats";
  return animalKind;
}

function buttonLabel(kind) {
  if (settings.animalTheme === "cats") return "Show another cat";
  if (settings.animalTheme === "dogs") return "Show another dog";
  return "Show another animal";
}

function releaseObjectUrl() {
  if (!activeObjectUrl) return;
  URL.revokeObjectURL(activeObjectUrl);
  activeObjectUrl = undefined;
}

function showLocalFallback(kind) {
  releaseObjectUrl();
  const fallback = LOCAL_ART[kind];
  artElement.src = fallback.src;
  artElement.alt = fallback.alt;
  captionElement.textContent = fallback.loadingCaption;
}

function setLoading(kind, loading) {
  artPanel.classList.toggle("is-loading", loading);
  artPanel.setAttribute("aria-busy", String(loading));
  anotherButton.disabled = loading;
  anotherButton.textContent = loading
    ? `Finding a ${kind === "cats" ? "cat" : "dog"}…`
    : buttonLabel(kind);
}

function playRefreshAnimation() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const animations = [
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
  ];

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

  Promise.allSettled(animations.map((animation) => animation.finished));
}

async function fetchRemoteImage(kind, signal) {
  const service = PawseAnimalApi.SERVICES[kind];
  const requestOptions = {
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
    referrerPolicy: "no-referrer",
    signal,
  };
  const metadataResponse = await fetch(service.endpoint, {
    ...requestOptions,
    headers: { Accept: "application/json" },
  });

  if (!metadataResponse.ok) {
    throw new Error(`Animal service returned ${metadataResponse.status}.`);
  }

  const imageUrl = PawseAnimalApi.imageUrlFromResponse(
    kind,
    await metadataResponse.json(),
  );
  const imageResponse = await fetch(imageUrl, {
    ...requestOptions,
    headers: { Accept: "image/avif,image/webp,image/*" },
  });

  if (!imageResponse.ok) {
    throw new Error(`Animal image returned ${imageResponse.status}.`);
  }

  const contentType = (imageResponse.headers.get("content-type") || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new TypeError("Animal service returned an unsupported image type.");
  }

  const advertisedLength = Number(
    imageResponse.headers.get("content-length") || 0,
  );
  if (advertisedLength > MAX_IMAGE_BYTES) {
    throw new RangeError("Animal image exceeded the safe size limit.");
  }

  const chunks = [];
  let receivedBytes = 0;
  const reader = imageResponse.body?.getReader();
  if (!reader) {
    const imageBlob = await imageResponse.blob();
    if (imageBlob.size === 0 || imageBlob.size > MAX_IMAGE_BYTES) {
      throw new RangeError("Animal image size was outside the safe limit.");
    }
    return URL.createObjectURL(imageBlob);
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    receivedBytes += value.byteLength;
    if (receivedBytes > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new RangeError("Animal image exceeded the safe size limit.");
    }
    chunks.push(value);
  }

  if (receivedBytes === 0) {
    throw new RangeError("Animal service returned an empty image.");
  }

  return URL.createObjectURL(new Blob(chunks, { type: contentType }));
}

function decodeObjectUrl(objectUrl, signal) {
  const preload = new Image();
  preload.src = objectUrl;

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback) => (value) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", handleAbort);
      callback(value);
    };
    const handleAbort = finish(() =>
      reject(new Error("Animal image loading was canceled.")),
    );
    const handleSuccess = finish(() => resolve(preload));
    const handleFailure = finish(reject);

    if (signal.aborted) {
      handleAbort();
      return;
    }

    signal.addEventListener("abort", handleAbort, { once: true });
    preload.decode().then(handleSuccess, handleFailure);
  });
}

async function loadAnimal(kind, sequence, controller) {
  const timeoutId = window.setTimeout(
    () => controller.abort("timeout"),
    REQUEST_TIMEOUT_MS,
  );
  let candidateObjectUrl;

  try {
    candidateObjectUrl = await fetchRemoteImage(kind, controller.signal);
    const preload = await decodeObjectUrl(candidateObjectUrl, controller.signal);
    if (preload.naturalWidth * preload.naturalHeight > MAX_IMAGE_PIXELS) {
      throw new RangeError("Animal image dimensions exceeded the safe limit.");
    }

    if (sequence !== requestSequence) {
      URL.revokeObjectURL(candidateObjectUrl);
      return;
    }

    releaseObjectUrl();
    activeObjectUrl = candidateObjectUrl;
    const remote = REMOTE_ART[kind];
    artElement.src = activeObjectUrl;
    artElement.alt = remote.alt;
    captionElement.textContent = remote.caption;
    detourStatus.textContent = [
      remote.alt,
      remote.caption,
      settings.showMessages ? MESSAGES[messageIndex] : "",
    ]
      .filter(Boolean)
      .join(" ");
    playRefreshAnimation();
  } catch (error) {
    if (candidateObjectUrl) URL.revokeObjectURL(candidateObjectUrl);
    if (sequence !== requestSequence) return;

    const fallback = LOCAL_ART[kind];
    captionElement.textContent = fallback.caption;
    detourStatus.textContent = [
      fallback.alt,
      fallback.caption,
      settings.showMessages ? MESSAGES[messageIndex] : "",
    ]
      .filter(Boolean)
      .join(" ");
  } finally {
    window.clearTimeout(timeoutId);
    if (sequence === requestSequence) setLoading(kind, false);
  }
}

function renderDetour(advance = false) {
  PawseTheme.applyTheme(settings.colorTheme);
  if (advance) messageIndex = (messageIndex + 1) % MESSAGES.length;

  animalKind = selectedAnimalKind(advance);
  messageElement.hidden = !settings.showMessages;
  messageElement.textContent = settings.showMessages ? MESSAGES[messageIndex] : "";
  anotherButton.hidden = false;
  showLocalFallback(animalKind);
  detourStatus.textContent = `Finding a fresh ${
    animalKind === "cats" ? "cat" : "dog"
  }.`;

  activeRequestController?.abort("superseded");
  activeRequestController = new AbortController();
  const sequence = ++requestSequence;
  setLoading(animalKind, true);
  void loadAnimal(animalKind, sequence, activeRequestController);
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
window.addEventListener("pagehide", () => {
  activeRequestController?.abort("pagehide");
  releaseObjectUrl();
});

void initialize();
