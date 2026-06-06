# ai-proxy

A small, reusable **server-side AI proxy** on Cloudflare Workers. It holds your
Anthropic API key server-side and exposes a drop-in compatible
`POST /v1/messages` endpoint, so browser front-ends can use Claude without ever
seeing the key.

This is intentionally project-agnostic — deploy it once and point multiple
sites at it, gating access with the `ALLOWED_ORIGINS` list.

## Endpoints

| Method | Path          | Purpose                                              |
| ------ | ------------- | ---------------------------------------------------- |
| POST   | `/v1/messages`| Proxies to the Anthropic Messages API (key injected) |
| GET    | `/health`     | Liveness check → `{ "ok": true }`                    |
| OPTIONS| any           | CORS preflight                                       |

The request body is the **standard Anthropic Messages API payload** (`model`,
`max_tokens`, `messages`, `system`, `stream`, …). The proxy validates it
lightly, injects `x-api-key` + `anthropic-version`, and streams the response
back. `stream: true` works.

## Setup

```bash
cd ai-proxy
npm install
cp .dev.vars.example .dev.vars   # then paste your real key into .dev.vars
npm run dev                      # local dev at http://localhost:8787
```

Deploy:

```bash
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY   # paste the key when prompted
npm run deploy
```

After deploy, Wrangler prints your Worker URL
(e.g. `https://ai-proxy.<subdomain>.workers.dev`). Use that as the base URL in
your front-ends.

## Configuration (`wrangler.toml` `[vars]`)

| Var                | Meaning                                                        |
| ------------------ | -------------------------------------------------------------- |
| `ALLOWED_ORIGINS`  | Comma-separated origins allowed via CORS. `*` = any (testing). |
| `ALLOWED_MODELS`   | Comma-separated model allowlist. `*` = any.                    |
| `ANTHROPIC_VERSION`| `anthropic-version` header (default `2023-06-01`).             |
| `MAX_BODY_BYTES`   | Reject bodies larger than this (default `32768`).              |

`ANTHROPIC_API_KEY` is a **secret**, set via `wrangler secret put` — never put
it in `wrangler.toml` or commit it.

## Wiring up the ReCaptured diagnostic

In `index.html`, the diagnostic currently calls `api.anthropic.com` directly,
which fails in the browser (no key) and silently falls back to the local
keyword engine. Point it at this proxy instead:

```js
// was: "https://api.anthropic.com/v1/messages"
res = await fetch("https://ai-proxy.<your-subdomain>.workers.dev/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ model: "...", max_tokens: 1000, messages: [...] }),
  signal: ctrl.signal,
});
```

No `x-api-key` header on the client — the proxy adds it. The existing
`localEngine` fallback stays as a safety net.

## Baseline protections included

- **Origin allowlist** — rejects non-allowlisted callers (not just CORS).
- **Model allowlist** — stops your key being used for arbitrary models.
- **Body-size cap** — rejects oversized payloads.

## Recommended next hardening (not included yet)

- **Rate limiting / abuse protection** — add Cloudflare
  [Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
  or a Turnstile token check before forwarding. A public proxy without this can
  be abused to burn your credits.
- **Per-app auth** — a shared secret header per front-end if you host several.
