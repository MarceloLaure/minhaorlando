// Edge Function: kiwify-webhook
// Recebe webhooks da Kiwify (compra aprovada, reembolso, chargeback)
// e processa: cria/atualiza familia, libera acesso, vincula convidados.
//
// Variaveis de ambiente necessarias (configurar via Supabase Dashboard):
// - KIWIFY_WEBHOOK_TOKEN: token HMAC do webhook (Kiwify Dashboard > Apps > Webhooks)
// - SUPABASE_URL: ja vem por padrao
// - SUPABASE_SERVICE_ROLE_KEY: ja vem por padrao
//
// Deploy:
//   supabase functions deploy kiwify-webhook --no-verify-jwt

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ============================================================
// MAPA DOS PRODUTOS KIWIFY → PLANO INTERNO
// ============================================================
type PlanInfo = {
  plan: string;
  months: number;
  type: "owner" | "guest";
  guest_discount?: "none" | "50_off" | "free";
};

const PRODUCT_MAP: Record<string, PlanInfo> = {
  // Pacotes Familia (owner)
  "eb1c5930-49c3-11f1-80a2-f1235c44dc68": { plan: "family_3m",  months: 3,  type: "owner", guest_discount: "none"   },
  "e50edc10-49c4-11f1-8429-6552de9bcf5f": { plan: "family_6m",  months: 6,  type: "owner", guest_discount: "50_off" },
  "29764330-49c4-11f1-868b-5f63bdf518ed": { plan: "family_12m", months: 12, type: "owner", guest_discount: "free"   },
  // Acessos Convidado (guest)
  "676388b0-49c4-11f1-86bd-bdee16b247ca": { plan: "guest_3m",       months: 3, type: "guest" },
  "a659b2b0-49c4-11f1-9686-5fe4dd1c36c4": { plan: "guest_6m_50off", months: 6, type: "guest" },
};

// ============================================================
// HMAC-SHA1 (Kiwify usa SHA-1 no signature)
// ============================================================
async function hmacSha1Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ============================================================
// Gera invite_code de 8 chars sem confundir 0/O 1/I
// ============================================================
function genInviteCode(length = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

// ============================================================
// Extrai campos do payload Kiwify (formato pode variar)
// ============================================================
type KiwifyPayload = {
  order_id?: string;
  id?: string;
  product_id?: string;
  Product?: { id?: string; name?: string };
  product_name?: string;
  Customer?: { email?: string; full_name?: string };
  customer_email?: string;
  customer_name?: string;
  Commissions?: { charge_amount?: number };
  charge_amount?: number;
  tracking_param?: string;
  utm_content?: string;
  webhook_event_type?: string;
  order_status?: string;
  event?: string;
};

function extract(payload: KiwifyPayload) {
  return {
    orderId:   payload.order_id || payload.id || `noid-${Date.now()}`,
    productId: payload.product_id || payload.Product?.id || "",
    productName: payload.product_name || payload.Product?.name || "",
    buyerEmail: ((payload.Customer?.email || payload.customer_email || "") as string).toLowerCase().trim(),
    buyerName:  payload.Customer?.full_name || payload.customer_name || null,
    inviteCode: (payload.tracking_param || payload.utm_content || null) as string | null,
    amount:     ((payload.Commissions?.charge_amount || payload.charge_amount || 0) as number) / 100,
    eventType:  (payload.webhook_event_type || payload.event || payload.order_status || "").toLowerCase(),
  };
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================
serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const KIWIFY_TOKEN = Deno.env.get("KIWIFY_WEBHOOK_TOKEN") || "";
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
  const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!KIWIFY_TOKEN || !SUPABASE_URL || !SERVICE_KEY) {
    console.error("[kiwify-webhook] missing env vars");
    return new Response("Server misconfigured", { status: 500 });
  }

  // Validacao HMAC (Kiwify manda o signature como query param)
  const url = new URL(req.url);
  const signature = url.searchParams.get("signature") || "";
  const rawBody = await req.text();

  const expected = await hmacSha1Hex(KIWIFY_TOKEN, rawBody);
  if (signature !== expected) {
    console.error("[kiwify-webhook] invalid signature", { signature, expected });
    return new Response("Invalid signature", { status: 401 });
  }

  // Parse JSON
  let payload: KiwifyPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const data = extract(payload);
  console.log("[kiwify-webhook]", {
    event: data.eventType,
    order: data.orderId,
    product: data.productId,
    email: data.buyerEmail,
  });

  const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // Log audit (sempre, antes de processar)
  await supa.from("kiwify_orders").upsert({
    order_id:      data.orderId,
    product_id:    data.productId,
    product_name:  data.productName,
    buyer_email:   data.buyerEmail,
    buyer_name:    data.buyerName,
    plan:          PRODUCT_MAP[data.productId]?.plan || null,
    amount_brl:    data.amount,
    invite_code:   data.inviteCode,
    status:        data.eventType,
    raw_payload:   payload,
    processed_at:  new Date().toISOString(),
  }, { onConflict: "order_id" });

  // === Roteamento por tipo de evento ===
  const isPaid = ["order_approved", "order_paid", "approved", "paid"].includes(data.eventType);
  const isRefund = ["order_refunded", "refund", "refunded"].includes(data.eventType);
  const isChargeback = ["chargeback", "order_chargeback"].includes(data.eventType);

  if (isPaid) {
    const productInfo = PRODUCT_MAP[data.productId];
    if (!productInfo) {
      console.warn("[kiwify-webhook] unknown product_id, only logged", data.productId);
      return jsonOk({ note: "unknown product, logged only" });
    }
    if (productInfo.type === "owner") {
      await processOwnerPayment(supa, data, productInfo);
    } else {
      await processGuestPayment(supa, data, productInfo);
    }
    return jsonOk({ processed: productInfo.plan });
  }

  if (isRefund || isChargeback) {
    await processRefund(supa, data.orderId, isChargeback ? "chargeback" : "refunded");
    return jsonOk({ processed: "revoked" });
  }

  // Evento ignorado mas logado
  return jsonOk({ ignored: data.eventType });
});

function jsonOk(body: unknown) {
  return new Response(JSON.stringify({ ok: true, ...(body as object) }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// ============================================================
// PROCESSADORES
// ============================================================

async function processOwnerPayment(supa: any, data: any, info: PlanInfo) {
  const paidAt = new Date();
  const accessUntil = new Date(paidAt);
  accessUntil.setMonth(accessUntil.getMonth() + info.months);
  const accessUntilStr = accessUntil.toISOString().slice(0, 10);

  // Tenta enriquecer trip_start vindo da waitlist (se a pessoa entrou na fila antes)
  let tripStart: string | null = null;
  const { data: wl } = await supa.from("waitlist")
    .select("trip_date")
    .eq("email", data.buyerEmail)
    .maybeSingle();
  if (wl?.trip_date) tripStart = wl.trip_date;

  // Procura familia existente desse email
  const { data: existing } = await supa.from("families")
    .select("id, invite_code")
    .eq("owner_email", data.buyerEmail)
    .maybeSingle();

  let familyId: string;

  if (existing) {
    familyId = existing.id;
    const inviteCode = existing.invite_code || genInviteCode();
    await supa.from("families").update({
      plan: info.plan,
      paid_at: paidAt.toISOString(),
      trip_start: tripStart,
      access_until: accessUntilStr,
      status: "active",
      kiwify_order_id: data.orderId,
      invite_code: inviteCode,
    }).eq("id", familyId);
  } else {
    const firstName = (data.buyerName || "").split(" ")[0] || "Família";
    const inviteCode = genInviteCode();
    const { data: created, error } = await supa.from("families").insert({
      name: `Família ${firstName}`,
      owner_email: data.buyerEmail,
      plan: info.plan,
      paid_at: paidAt.toISOString(),
      trip_start: tripStart,
      access_until: accessUntilStr,
      status: "active",
      kiwify_order_id: data.orderId,
      invite_code: inviteCode,
    }).select("id").single();
    if (error) {
      console.error("[kiwify-webhook] family create error", error);
      return;
    }
    familyId = created.id;
  }

  // Adiciona owner ao allowed_users (admin da propria familia)
  await supa.from("allowed_users").upsert({
    email: data.buyerEmail,
    name: data.buyerName,
    role: "admin",
    status: "active",
    family_id: familyId,
  }, { onConflict: "email" });

  // Linka ordem com familia
  await supa.from("kiwify_orders")
    .update({ family_id: familyId })
    .eq("order_id", data.orderId);

  console.log("[kiwify-webhook] owner activated", { email: data.buyerEmail, plan: info.plan, familyId });
}

async function processGuestPayment(supa: any, data: any, info: PlanInfo) {
  if (!data.inviteCode) {
    console.error("[kiwify-webhook] guest payment without invite_code", data.orderId);
    return;
  }

  // Acha familia owner pelo invite_code
  const { data: owner } = await supa.from("families")
    .select("id, access_until, trip_start, plan")
    .eq("invite_code", data.inviteCode)
    .maybeSingle();

  if (!owner) {
    console.error("[kiwify-webhook] invalid invite_code", data.inviteCode);
    return;
  }

  // Valida que o owner tem o plano certo pra esse tipo de convidado
  // (ex: convidado 6m 50% so pode ser usado por owner 6m+ )
  if (info.plan === "guest_6m_50off" && !["family_6m", "family_12m"].includes(owner.plan)) {
    console.error("[kiwify-webhook] guest_6m_50off requires owner with family_6m or family_12m", owner.plan);
    return;
  }

  const paidAt = new Date();
  const guestEnd = new Date(paidAt);
  guestEnd.setMonth(guestEnd.getMonth() + info.months);
  // Convidado nao pode ter acesso depois do owner expirar
  const ownerEnd = new Date(owner.access_until);
  const accessUntil = guestEnd < ownerEnd ? guestEnd : ownerEnd;
  const accessUntilStr = accessUntil.toISOString().slice(0, 10);

  // Cria familia do convidado
  const firstName = (data.buyerName || "").split(" ")[0] || "Família";
  const { data: guestFamily, error } = await supa.from("families").insert({
    name: `Família ${firstName}`,
    owner_email: data.buyerEmail,
    plan: info.plan,
    paid_at: paidAt.toISOString(),
    trip_start: owner.trip_start,
    access_until: accessUntilStr,
    status: "active",
    kiwify_order_id: data.orderId,
  }).select("id").single();

  if (error) {
    console.error("[kiwify-webhook] guest family create error", error);
    return;
  }

  // Cria vinculo
  await supa.from("family_links").insert({
    owner_family_id: owner.id,
    guest_family_id: guestFamily.id,
    permission: "view",
  });

  // Adiciona ao allowed_users
  await supa.from("allowed_users").upsert({
    email: data.buyerEmail,
    name: data.buyerName,
    role: "admin",
    status: "active",
    family_id: guestFamily.id,
  }, { onConflict: "email" });

  await supa.from("kiwify_orders")
    .update({ family_id: guestFamily.id })
    .eq("order_id", data.orderId);

  console.log("[kiwify-webhook] guest activated", {
    email: data.buyerEmail,
    plan: info.plan,
    guestFamily: guestFamily.id,
    ownerFamily: owner.id,
  });
}

async function processRefund(supa: any, orderId: string, status: "refunded" | "chargeback") {
  const { data: order } = await supa.from("kiwify_orders")
    .select("family_id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!order?.family_id) {
    console.warn("[kiwify-webhook] refund for unknown order", orderId);
    return;
  }

  await supa.from("families").update({
    status,
    access_until: new Date().toISOString().slice(0, 10), // expira hoje
  }).eq("id", order.family_id);

  await supa.from("allowed_users").update({ status: "paused" })
    .eq("family_id", order.family_id);

  console.log("[kiwify-webhook] revoked", { orderId, status });
}
