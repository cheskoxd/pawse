(function attachDomainUtils(root) {
  "use strict";

  const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

  function isIPv4(hostname) {
    const parts = hostname.split(".");
    return (
      parts.length === 4 &&
      parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
    );
  }

  function isValidHostname(hostname) {
    if (
      typeof hostname !== "string" ||
      hostname.length > 253 ||
      !hostname.includes(".") ||
      hostname.includes("*") ||
      hostname === "localhost"
    ) {
      return false;
    }

    if (isIPv4(hostname)) {
      return true;
    }

    return hostname.split(".").every((label) => DOMAIN_LABEL.test(label));
  }

  function normalizeDomainInput(value) {
    if (typeof value !== "string" || !value.trim()) {
      throw new Error("Enter a website or hostname.");
    }

    const raw = value.trim();
    if (raw.includes("*") || /\s/.test(raw)) {
      throw new Error("Use one hostname without spaces or wildcards.");
    }

    const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(raw)
      ? raw
      : `https://${raw}`;

    let parsed;
    try {
      parsed = new URL(candidate);
    } catch {
      throw new Error("That does not look like a valid website.");
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error("Only http and https websites can be added.");
    }

    const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
    if (!isValidHostname(hostname)) {
      throw new Error("Enter a full hostname such as example.com.");
    }

    return hostname;
  }

  function domainCovers(parent, child) {
    return child === parent || child.endsWith(`.${parent}`);
  }

  function addCoveredDomain(domains, domain) {
    const unique = [...new Set(domains)];
    if (unique.some((item) => domainCovers(item, domain))) {
      return unique.sort();
    }

    return unique
      .filter((item) => !domainCovers(domain, item))
      .concat(domain)
      .sort();
  }

  function removeDomain(domains, domain) {
    return domains.filter((item) => item !== domain);
  }

  function removeOverlaps(domains, domain) {
    return domains.filter(
      (item) => !domainCovers(item, domain) && !domainCovers(domain, item),
    );
  }

  function isHttpUrl(value) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  const api = {
    addCoveredDomain,
    domainCovers,
    isHttpUrl,
    isValidHostname,
    normalizeDomainInput,
    removeDomain,
    removeOverlaps,
  };

  root.PawseDomainUtils = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis === "undefined" ? this : globalThis);
