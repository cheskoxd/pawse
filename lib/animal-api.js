(function attachAnimalApi(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.PawseAnimalApi = api;
})(typeof globalThis === "object" ? globalThis : this, () => {
  const SERVICES = Object.freeze({
    cats: Object.freeze({
      endpoint: "https://cataas.com/cat?json=true&type=medium&format=webp",
      imageOrigin: "https://cataas.com",
      imagePathPrefix: "/cat/",
    }),
    dogs: Object.freeze({
      endpoint: "https://dog.ceo/api/breeds/image/random",
      imageOrigin: "https://images.dog.ceo",
      imagePathPrefix: "/breeds/",
    }),
  });

  function serviceFor(kind) {
    const service = SERVICES[kind];
    if (!service) throw new TypeError(`Unknown animal kind: ${kind}`);
    return service;
  }

  function isTrustedImageUrl(kind, value) {
    if (typeof value !== "string" || value.length === 0) return false;

    try {
      const service = serviceFor(kind);
      const url = new URL(value, service.imageOrigin);
      return (
        url.protocol === "https:" &&
        url.origin === service.imageOrigin &&
        url.username === "" &&
        url.password === "" &&
        url.pathname.length > service.imagePathPrefix.length &&
        url.pathname.startsWith(service.imagePathPrefix)
      );
    } catch {
      return false;
    }
  }

  function imageUrlFromResponse(kind, payload) {
    const service = serviceFor(kind);
    let candidate;

    if (kind === "dogs") {
      if (payload?.status !== "success") {
        throw new TypeError("Dog CEO did not return a successful response.");
      }
      candidate = payload.message;
    } else if (typeof payload?.url === "string") {
      candidate = payload.url;
    } else if (
      typeof payload?.id === "string" &&
      /^[A-Za-z0-9_-]{1,128}$/.test(payload.id)
    ) {
      candidate = `${service.imageOrigin}/cat/${encodeURIComponent(payload.id)}`;
    }

    if (!isTrustedImageUrl(kind, candidate)) {
      throw new TypeError("The animal service returned an untrusted image URL.");
    }

    return new URL(candidate, service.imageOrigin).href;
  }

  return Object.freeze({
    SERVICES,
    imageUrlFromResponse,
    isTrustedImageUrl,
  });
});
