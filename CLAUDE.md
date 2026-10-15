# CLAUDE.md

Static marketing site for recaptured.io, served by GitHub Pages from `main`. See README.md for the page map.

- Never push to main or change repository settings without the user's explicit 'ship it' in the current session. Work on a branch, show the diff and checks, then stop.

## Hands off

Never change `legal/sms-terms/`, `.well-known/security.txt`, `CNAME` or `.nojekyll` unless the task names them explicitly.

## Before any commit

- Grep the tree for `Input needed`, `KAIA`, `data-internal` and `[publish date]`. If any appear, do not commit.
- Confirm every HTML page except `kaia/index.html` contains `G-T5K911DXHT`.
- Confirm every internal href resolves to a file in the repo.

## New pages

Every new page gets:
- a `<title>`, a meta description, and a canonical URL with a trailing slash;
- Open Graph and Twitter tags, the favicon block, `/assets/relaunch.css` and the GA4 snippet;
- the shared header and footer, copied from an existing page;
- an entry in `sitemap.xml` with `changefreq` and `priority`.

## Legal pages

Legal pages carry an "Effective date:" or "Last updated:" line. Changing legal copy means updating that date. For the three accepted documents (terms, privacy, acceptable-use), tell the user that in-app re-acceptance may be required.

## Controlled copy

Product claims on `/trust/` and `/assistant/` are controlled copy. Do not add or strengthen a claim without the user confirming it is true in the shipped product.

## Fictional data

Use only these names: Pellford Medical Group, Calder Yard, Brindlecrest Builders, Larkhollow Mechanical, Gullwhistle Yacht Club, Theo Marchbanks, Marisol Quenneville. Crew and colleague names in screenshots may also appear as an initial plus surname (currently D. Okafor, M. Trevino, R. Alvarez, S. Nakamura); these identify no one and need no check. Any new full name still needs a collision check.

## Publishing

A push to `main` is the publish. Say so before pushing.
