// Edge Function: queue-times-proxy
// Proxy CORS para a API queue-times.com
// Uso: GET /functions/v1/queue-times-proxy?parkId=6

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Whitelist de queue-times.com park IDs
// Verificados em https://queue-times.com/parks.json
const ALLOWED_PARK_IDS = [
  6,    // Magic Kingdom
  5,    // EPCOT
  7,    // Hollywood Studios
  8,    // Animal Kingdom
  65,   // Universal Studios Florida
  64,   // Islands of Adventure
  67,   // Volcano Bay
  334,  // Epic Universe
  21,   // SeaWorld Orlando
  24,   // Busch Gardens Tampa Bay
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const parkIdStr = url.searchParams.get("parkId");

    if (!parkIdStr) {
      return new Response(
        JSON.stringify({ error: "Missing parkId parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const parkId = parseInt(parkIdStr, 10);

    if (isNaN(parkId) || !ALLOWED_PARK_IDS.includes(parkId)) {
      return new Response(
        JSON.stringify({
          error: "Invalid parkId",
          received: parkIdStr,
          allowed: ALLOWED_PARK_IDS,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const queueTimesUrl = `https://queue-times.com/parks/${parkId}/queue_times.json`;

    const response = await fetch(queueTimesUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "MinhaOrlando/1.0 (+https://minhaorlando.com.br)",
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: `Queue-Times API returned ${response.status}`,
          parkId,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        parkId,
        fetched_at: new Date().toISOString(),
        data,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60",
        },
      }
    );
  } catch (error) {
    console.error("Error in queue-times-proxy:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
