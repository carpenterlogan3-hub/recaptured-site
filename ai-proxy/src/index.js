/**
 * Reusable server-side AI proxy (Cloudflare Worker).
 *
 * Holds the Anthropic API key server-side so it is never shipped to a browser,
 * and exposes a drop-in compatible POST /v1/messages endpoint that any of your
 * front-ends can call. Not specific to any one project — point multiple sites
 * at it and gate access with the ALLOWED_ORIGINS list.
 *
 * Config (wrangler.toml [vars] + one secret):
 *   ANTHROPIC_API_KEY  (secret) -> wrangler secret put ANTHROPIC_API_KEY
 *   ALLOWED_ORIGINS    comma-separated origins allowed via CORS, or "*" for any
 *   ALLOWED_MODELS     comma-separated model allowlist, or "*" for any
 *   ANTHROPIC_VERSION  anthropic-version header (default 2023-06-01)
 *   MAX_BODY_BYTES     reject request bodies larger than this (default 32768)
 */

const UPSTREAM = "https://api.anthropic.com/v1/messages";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true }, 200, cors);
    }

    if (request.method !== "POST" || url.pathname !== "/v1/messages") {
      return json({ error: "Not found" }, 404, cors);
    }

    // Reject disallowed origins outright (CORS only protects browsers; this
    // protects against non-browser callers too).
    if (!isOriginAllowed(origin, env)) {
      return json({ error: "Origin not allowed" }, 403, cors);
    }

    const maxBytes = int(env.MAX_BODY_BYTES, 32768);
    const raw = await request.text();
    if (raw.length > maxBytes) {
      return json({ error: "Request body too large" }, 413, cors);
    }

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return json({ error: "Invalid JSON" }, 400, cors);
    }

    if (!payload || typeof payload !== "object" || !Array.isArray(payload.messages)) {
      return json({ error: "Body must include a `messages` array" }, 400, cors);
    }

    if (!isModelAllowed(payload.model, env)) {
      return json({ error: "Model not allowed: " + String(payload.model) }, 400, cors);
    }

    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: "Proxy misconfigured: missing API key" }, 500, cors);
    }

    let upstream;
    try {
      upstream = await fetch(UPSTREAM, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": env.ANTHROPIC_VERSION || "2023-06-01",
        },
        body: JSON.stringify(payload),
      });
    } catch {
      return json({ error: "Upstream request failed" }, 502, cors);
    }

    // Pass the upstream response straight through (body streams for
    // `stream: true` requests), with our CORS headers layered on.
    const headers = new Headers(cors);
    headers.set("Content-Type", upstream.headers.get("Content-Type") || "application/json");
    return new Response(upstream.body, { status: upstream.status, headers });
  },
};

function corsHeaders(origin, env) {
  const h = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (env.ALLOWED_ORIGINS === "*") {
    h["Access-Control-Allow-Origin"] = "*";
  } else if (isOriginAllowed(origin, env)) {
    h["Access-Control-Allow-Origin"] = origin;
  }
  return h;
}

function isOriginAllowed(origin, env) {
  const list = env.ALLOWED_ORIGINS || "";
  if (list === "*") return true;
  if (!origin) return false;
  return list.split(",").map((s) => s.trim()).filter(Boolean).includes(origin);
}

function isModelAllowed(model, env) {
  const list = env.ALLOWED_MODELS || "*";
  if (list === "*") return true;
  if (typeof model !== "string" || !model) return false;
  return list.split(",").map((s) => s.trim()).filter(Boolean).includes(model);
}

function int(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function json(obj, status, cors) {
  const headers = new Headers(cors);
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(obj), { status, headers });
}
