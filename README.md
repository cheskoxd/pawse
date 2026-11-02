<p align="center">
  <img src="assets/github-banner.png" alt="Pawse cat and dog illustration" width="100%" />
</p>

<h1 align="center">Pawse</h1>

<p align="center">
  An on-device Chrome extension that redirects adult sites to a calmer page with cats and dogs.
</p>

<p align="center">
  Manifest V3 &nbsp;·&nbsp; Chrome 101+ &nbsp;·&nbsp; No build step &nbsp;·&nbsp; No telemetry
</p>

Pawse redirects top-level visits to 35 bundled adult domains. You can add your own blocked hostnames, create exceptions with an allowlist, and optionally enable broader hostname matching. Everything runs from the files in this repository.

## Features

- Redirects 35 bundled domains and their subdomains to a local detour page.
- Adds custom hostnames and their subdomains to a personal blocklist.
- Lets the allowlist override bundled, strict, and custom blocking rules.
- Offers optional strict hostname rules for broader coverage.
- Rotates between bundled cat and dog artwork with short, nonjudgmental messages.
- Includes System, Light, and Dark appearance modes.
- Stores settings locally with `chrome.storage.local`.
- Contains no analytics, ads, accounts, or remote image feeds.

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

Pawse uses Chrome's Declarative Net Request API to inspect top-level HTTP and HTTPS navigation locally. The bundled rules match known hostnames, while custom block and allow entries become dynamic rules. An allow rule has the highest priority.

Strict matching is off by default. When enabled, four additional regular-expression rules inspect hostnames for common adult-site terms. They do not scan page contents, paths, or search queries, but they can still produce false positives.

## Permissions

| Permission | Why Pawse needs it |
| --- | --- |
| `storage` | Saves preferences and custom hostname lists on this device. |
| `declarativeNetRequestWithHostAccess` | Lets Chrome apply Pawse's local redirect and allow rules. |
| HTTP and HTTPS site access | Lets those rules match website navigation and lets the popup read the active web tab's hostname when you open it. |

Pawse's code does not initiate remote requests or upload URLs. See [PRIVACY.md](PRIVACY.md) for the full data and permissions explanation.

## Limits

Pawse is a hostname blocker, not a content classifier. It will not identify every adult site, discover new mirrors automatically, or detect adult material on an otherwise general-purpose platform. It does not block native apps, other browsers, or Chrome profiles where it is not installed.

Pawse is also not tamper-resistant parental-control software. Anyone with access to Chrome's extension settings can disable or uninstall it, change its lists, or revoke Incognito access.

## Development

There is no generated output, package manifest, or dependency install. The checked-in HTML, CSS, JavaScript, JSON, and image files are the extension.

Run the automated checks with Node.js:

```sh
node --test tests/domain-utils.test.js
```

These tests cover hostname utilities, rule-file consistency, strict-rule examples, and theme support. They are not browser end-to-end tests. See [CONTRIBUTING.md](CONTRIBUTING.md) for the manual Chrome checklist and contribution workflow.

## Project artwork

- [README banner](assets/github-banner.png)
- [Square project artwork](assets/github-square.png)
- [Asset provenance](assets/README.md)

## Security

Please do not publish sensitive vulnerability details in a regular issue. Follow the private reporting instructions in [SECURITY.md](SECURITY.md).

## License

Pawse is available under the [MIT License](LICENSE).
