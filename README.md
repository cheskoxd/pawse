<p align="center">
  <img src="assets/github-banner.png" alt="Pawse cat and dog illustration" width="100%" />
</p>

<h1 align="center">Pawse</h1>

<p align="center">
  A privacy-conscious Chrome extension that redirects 35 known adult sites to a calmer animal break.
</p>

<p align="center">
  Manifest V3 &nbsp;·&nbsp; Chrome 101+ &nbsp;·&nbsp; No build step &nbsp;·&nbsp; No telemetry
</p>

Pawse redirects top-level visits to 35 bundled adult domains. You can block more hostnames, create exceptions with an allowlist, and optionally enable broader hostname matching. Blocking and settings stay local; the detour page requests a fresh cat or dog image from a narrowly allowlisted animal API.

## Features

- Redirects 35 bundled domains and their subdomains to a local detour page.
- Blocks custom hostnames and their subdomains without requesting ongoing access to them.
- Lets the allowlist override bundled, strict, and custom blocking rules.
- Offers optional strict hostname rules for broader coverage.
- Loads random cats from [Cataas](https://cataas.com/) and random dogs from [Dog CEO](https://dog.ceo/dog-api/), with bundled artwork as an offline fallback.
- Includes System, Light, and Dark appearance modes.
- Stores settings locally with `chrome.storage.local`.
- Contains no analytics, ads, or accounts, and never sends the blocked URL to an image service.

## Install from source

1. Clone or download this repository.

   ```sh
   git clone https://github.com/cheskoxd/pawse.git
   ```

2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select the cloned folder, the one that directly contains `manifest.json`.
6. Optional: pin Pawse from Chrome's Extensions menu.

Chrome loads the source files directly. After editing a file, return to `chrome://extensions` and reload Pawse.

### Incognito windows

Chrome disables extensions in Incognito by default. Open Pawse's **Details** page in `chrome://extensions`, then turn on **Allow in Incognito** if you want blocking there too.

## How it works

Pawse uses Chrome's Declarative Net Request API to handle top-level HTTP and HTTPS navigation locally. One bundled redirect rule covers 35 listed domains and their subdomains. Those matches open the local Pawse page.

Custom and strict matches use Chrome's safe `block` rules, which do not need host access. Chrome shows its standard blocked-request page for those matches. Strict matching is off by default and can still produce false positives. The allowlist has the highest priority.

## Permissions

| Permission | Why Pawse needs it |
| --- | --- |
| `storage` | Saves preferences and custom hostname lists on this device. |
| `activeTab` | Temporarily reads the current tab's hostname after you open the popup. |
| `declarativeNetRequest` | Lets Chrome apply local redirect, block, and allow rules without exposing page contents to Pawse. |
| 35 listed host patterns | Lets those domains and their subdomains redirect to the local Pawse page. Pawse does not request access to every site. |
| `https://dog.ceo/*`, `https://images.dog.ceo/*`, `https://cataas.com/*` | Requests random animal metadata and image bytes only while the detour page is open. |

The animal requests use no cookies or referrer and do not include the blocked hostname, custom lists, or settings. The providers still receive ordinary connection details such as an IP address. See [PRIVACY.md](PRIVACY.md) for the full data and permissions explanation.

## Limits

Pawse is a hostname blocker, not a content classifier. It will not identify every adult site, discover new mirrors automatically, or detect adult material on an otherwise general-purpose platform. It does not block native apps, other browsers, or Chrome profiles where it is not installed.

Pawse is also not tamper-resistant parental-control software. Anyone with access to Chrome's extension settings can disable or uninstall it, change its lists, or revoke Incognito access.

## Development

There is no generated output, package manifest, or dependency install. The checked-in HTML, CSS, JavaScript, JSON, and fallback image files are the extension.

Run the automated checks with Node.js:

```sh
node --test tests/domain-utils.test.js
```

These tests cover hostname utilities, rule-file consistency, animal-service URL validation, strict-rule examples, and theme support. They are not browser end-to-end tests. See [CONTRIBUTING.md](CONTRIBUTING.md) for the manual Chrome checklist and contribution workflow.

## Project artwork

- [README banner](assets/github-banner.png)
- [Square project artwork](assets/github-square.png)
- [Asset provenance](assets/README.md)

## Security

Please do not publish sensitive vulnerability details in a regular issue. Follow the private reporting instructions in [SECURITY.md](SECURITY.md).

## License

Pawse is available under the [MIT License](LICENSE).
