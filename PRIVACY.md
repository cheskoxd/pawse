# Pawse Privacy Notice

Pawse keeps blocking, preferences, and hostname lists local. It does not use analytics, serve ads, create user accounts, or upload browsing history. When the detour page is open, it requests a random cat or dog image from the services described below.

## Data Pawse reads

When you open the toolbar popup, Pawse reads the active tab's URL so it can display the hostname and offer a one-click block action. The full URL is never stored. If you choose to block the site, Pawse normalizes and stores only its hostname.

Chrome evaluates top-level HTTP and HTTPS navigation against Pawse's local rules. Pawse does not receive or inspect page contents.

## Data Pawse stores

Pawse uses `chrome.storage.local` to save:

- whether protection and strict matching are enabled;
- the selected animal and message preferences;
- the System, Light, or Dark appearance preference;
- custom blocked hostnames; and
- allowed hostnames.

This data remains in the current Chrome profile until you change it or remove the extension. Pawse does not send it to the developer, Dog CEO, or Cataas. Removing Pawse from Chrome removes its extension storage from that profile.

## Network activity

The detour page requests random animal metadata and image bytes from:

- [Dog CEO](https://dog.ceo/dog-api/) at `dog.ceo` and `images.dog.ceo`; or
- [Cataas](https://cataas.com/) at `cataas.com`.

Pawse makes these requests without cookies, cache reuse, or a referrer. It does not include the blocked URL, hostname lists, preferences, or a Pawse account identifier. Like any internet service, the selected provider can receive ordinary connection information and browser-supplied headers such as the IP address, user agent, request time, and extension origin. Its own policies and retention practices apply.

If a request fails, times out, returns an invalid URL, or returns an image larger than Pawse's limit, the page keeps using its bundled fallback artwork. No other remote image host is accepted. Pawse does not contact an analytics provider.

Allowed websites and pages you choose to visit can still make their own network requests. Chrome can also retain attempted URLs in browser history. Pawse is not a private-browsing or history-clearing tool.

## Incognito

Chrome disables Pawse in Incognito by default. If you explicitly enable **Allow in Incognito**, Chrome may make Pawse's locally stored settings available there. Pawse does not change Chrome's Incognito history or privacy behavior.

## Permissions

- `storage` saves local preferences and hostname lists.
- `activeTab` temporarily lets the popup read the active tab's hostname after you open it.
- `declarativeNetRequest` lets Chrome apply local redirect, block, and allow rules.
- Required blocking host access is limited to the 35 domains in Pawse's bundled list and their subdomains. It lets those hosts redirect to the local animal page.
- Three exact HTTPS host patterns cover Dog CEO's API, Dog CEO's image host, and Cataas. They are used only to request random animal metadata and image bytes on the detour page.

Pawse does not request general access to every website.

Custom and strict matches use Chrome's host-free block rules. Chrome shows its standard blocked-request page for those matches.

## Changes to this notice

Material privacy changes will be documented in this file and in the repository history.
