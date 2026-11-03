# Contributing to Pawse

Thanks for helping improve Pawse. Small, focused pull requests are easiest to review.

## Set up locally

Pawse has no build step or runtime dependencies. You need Chrome 101 or newer and a current Node.js release for the automated checks.

1. Fork and clone the repository.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the repository folder.
5. After each code change, reload Pawse from `chrome://extensions`.

## Run the checks

```sh
node --test tests/domain-utils.test.js
```

The automated checks do not launch Chrome. Before opening a pull request, also work through the relevant manual checks below.

## Manual Chrome checklist

- [ ] Pawse loads without errors on `chrome://extensions`.
- [ ] The popup controls and Settings link work.
- [ ] Adding `pawse-block.invalid` to the custom blocklist makes Chrome show its standard blocked-request page.
- [ ] Visiting a domain from `rules/core.json` redirects to the local detour page.
- [ ] The detour page loads a random animal, and **Show another** loads a new one.
- [ ] With the animal services offline or blocked, the detour page keeps showing bundled fallback art.
- [ ] Adding `pawse-block.invalid` to the allowlist stops the block.
- [ ] Removing that allow entry restores the custom block.
- [ ] With strict matching enabled, `very-porn-site.invalid` is blocked; with strict matching disabled, it is not.
- [ ] Preferences and custom lists remain after restarting Chrome.
- [ ] The detour page's Network panel contacts only `dog.ceo` and `images.dog.ceo`, or only `cataas.com`; no blocked URL appears in a request.
- [ ] System, Light, and Dark modes remain readable in the popup, settings, and detour page.
- [ ] If your change affects Incognito behavior, repeat the relevant test after enabling **Allow in Incognito**.

The `.invalid` domains above are reserved for testing and cannot resolve to public websites.

## Change guidelines

- Keep blocking rules limited to hostnames. Do not match words in paths or query strings.
- Keep blocking host access synchronized with the bundled domains in `rules/core.json`.
- Add a test when changing hostname normalization, precedence, rules, or themes.
- Do not add analytics, remote fonts, or runtime hosts beyond the documented animal services without a clear privacy and permissions review.
- Keep user-facing messages calm and nonjudgmental.
- Document new permissions or stored data in both `README.md` and `PRIVACY.md`.

## Pull requests

Explain what changed, why it changed, and how you tested it. Include before-and-after screenshots for visible interface changes.
