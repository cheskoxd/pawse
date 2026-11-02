# Pawse Privacy Notice

Pawse is designed to work locally. Its source code does not initiate remote requests, upload browsing data, use analytics, serve ads, or create user accounts.

## Data Pawse reads

When you open the toolbar popup, Pawse reads the active tab's URL so it can display the hostname and offer a one-click block action. The full URL is never stored. If you choose to block the site, Pawse normalizes and stores only its hostname.

Chrome also evaluates top-level HTTP and HTTPS navigation against Pawse's local redirect and allow rules. Pawse does not receive or inspect page contents.

## Data Pawse stores

Pawse uses `chrome.storage.local` to save:

- whether protection and strict matching are enabled;
- the selected animal and message preferences;
- the System, Light, or Dark appearance preference;
- custom blocked hostnames; and
- allowed hostnames.

This data remains in the current Chrome profile until you change it or remove the extension. It is not sent to the developer or a third party. Removing Pawse from Chrome removes its extension storage from that profile.

## Network activity

Pawse's scripts, styles, icons, and cat and dog artwork are bundled with the extension. The detour page does not contact an image service, analytics provider, or other remote endpoint.

Allowed websites and pages you choose to visit can still make their own network requests. Chrome can also retain attempted URLs in browser history. Pawse is not a private-browsing or history-clearing tool.

## Incognito

Chrome disables Pawse in Incognito by default. If you explicitly enable **Allow in Incognito**, Chrome may make Pawse's locally stored settings available there. Pawse does not change Chrome's Incognito history or privacy behavior.

## Permissions

- `storage` saves local preferences and hostname lists.
- `declarativeNetRequestWithHostAccess` lets Chrome apply local redirect and allow rules.
- HTTP and HTTPS host access lets those rules match website navigation and lets the popup read the active web tab's hostname when opened.

## Changes to this notice

Material privacy changes will be documented in this file and in the repository history.
