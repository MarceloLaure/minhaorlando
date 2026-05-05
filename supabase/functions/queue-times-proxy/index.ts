// Edge Function: queue-times-proxy
// Proxy CORS pra queue-times.com — aceita ?parkId=<id> e devolve o JSON cru.
// IDs validos = whitelist (sem isso vira SSRF).

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

// Whitelist de queue-times.com park IDs
// Verificados via https://queue-times.com/parks.json
const ALLOWED_PARK_IDS: ReadonlySet<number> = new Set([
  6,   // Magic Kingdom
  5,   // EPCOT
  7,   // Hollywood Studios
  8,   // Animal Kingdom
  65,  // Universal Studios Florida
  64,  // Islands of Adventure
  67,  // Volcano Bay
  334, // Epic Universe
  21,  // SeaWorld Orlando
  24,  // Busch Gardens Tampa Bay
]);

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "GET") return json(405, { error: "Method not allowed" });

  const url = new URL(req.url);
  const raw = url.searchParams.get("parkId");
  const parkId = raw ? Number(raw) : NaN;

  if (!Number.isInteger(parkId) || !ALLOWED_PARK_IDS.has(parkId)) {
    return json(400, {
      error: "Invalid parkId",
      received: raw,
      allowed: [...ALLOWED_PARK_IDS],
    });
  }

  const upstream = `https://queue-times.com/parks/${parkId}/queue_times.json`;
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 8000);

  try {
    const res = await fetch(upstream, {
      signal: ctrl.signal,
      headers: { "User-Agent": "MinhaOrlando-Proxy/1.0 (+https://minhaorlando.com.br)" },
    });

    if (!res.ok) {
      return json(502, {
        error: "Upstream error",
        status: res.status,
        parkId,
      });
    }

    const data = await res.json();
    return json(200, {
      success: true,
      parkId,
      fetched_at: new Date().toISOString(),
      data,
    });
  } catch (err) {
    return json(504, {
      error: "Upstream timeout or fetch failed",
      detail: (err as Error).message,
      parkId,
    });
  } finally {
    clearTimeout(timeout);
  }
});
