# recaptured.io

The marketing site for ReCaptured. It is plain static HTML served by GitHub Pages from the `main` branch, on the custom domain set in `CNAME` (recaptured.io). There is no build step: what is in the repo is what is served.

## Pages

| Path | Page |
| --- | --- |
| `/` | Home |
| `/assistant/` | AI assistant |
| `/pricing/` | Pricing and Founding 100 |
| `/pilot/` | 30-day pilot and application form |
| `/book/` | Book a call (Calendly) |
| `/trust/` | Trust and security |
| `/about/` | About |
| `/contact/` | Contact addresses |
| `/legal/` | Legal index |
| `/legal/terms/` | Terms of Service |
| `/legal/privacy/` | Privacy Notice |
| `/legal/acceptable-use/` | Acceptable Use Policy |
| `/legal/sms-terms/` | SMS Terms |
| `/legal/founding-100/` | Founding 100 Terms |
| `/legal/pilot-terms/` | Pilot Terms |
| `/legal/dmca/` | Copyright and DMCA Policy |

`404.html` is the custom not-found page (noindex). `kaia/` is a redirect stub that sends visitors to `/assistant/`; it has no analytics and is not in the sitemap.

## Shared files

- `assets/relaunch.css` is the stylesheet for every page.
- `assets/relaunch.js` sends the GA4 CTA events and runs the `/book/` intent picker (`?intent=demo` highlights the demo option).
- `assets/favicon/` and `assets/logo/` hold the brand assets.
- `assets/og-image.png` is the social preview image.
- `sitemap.xml`, `robots.txt` and `llms.txt` describe the site to search engines and AI crawlers.

## Protected paths

Do not change these without a specific reason.
- `legal/sms-terms/`: this URL is on file with Telnyx for the 10DLC messaging campaign.
- `.well-known/security.txt`: the published security contact.
- `CNAME`: the custom domain. Changing it takes the site off recaptured.io.
- `.nojekyll`: stops GitHub Pages from running Jekyll, which would drop `.well-known/`.

## How a change ships

Edit on `main` or on a branch and merge it. A push to `main` is the publish: GitHub Pages rebuilds in about a minute. Force-pushes and deleting `main` are blocked by branch protection.

The tags `pre-relaunch` and `relaunch-2026-10-16` mark the last commit of the old site and the October 2026 relaunch. To roll back to the old site as a new commit, keeping history:

```bash
git checkout main && git pull --ff-only && git revert --no-edit b041b2e 449f595 && git push origin main
```

## Interim pieces to replace

Both of these are placeholders for the ReCaptured web-forms module:

- The `/pilot/` form opens a `mailto:` to info@recaptured.io with the answers filled in; nothing is sent until the visitor presses send.
- `/book/` embeds Calendly inline.
