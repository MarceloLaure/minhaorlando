// Edge Function: register-free-guest
// Cadastra familia convidada GRATIS (caso owner tenha pacote 12 meses).
// Cria familia + family_link + allowed_users + dispara magic link.
//
// Usado pela pagina /convite/[code] quando owner.plan === 'family_12m'.
//
// IMPORTANTE: deployar com "Verify JWT" DESATIVADO — chamada vem da
// landing page sem auth (com anon key). Nao expoe nada sensivel.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return jsonError(405, "Method not allowed");

  // Parse body
  let body: any;
  try { body = await req.json(); }
  catch { return jsonError(400, "Invalid JSON"); }

  const code = (body.invite_code || "").toUpperCase().trim();
  const guestEmail = (body.email || "").toLowerCase().trim();

  if (!code) return jsonError(400, "Codigo de convite ausente");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
    return jsonError(400, "Email invalido");
  }

  const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // Busca familia owner pelo invite_code
  const { data: owner, error: ownerErr } = await supa
    .from("families")
    .select("id, name, owner_email, plan, status, access_until, trip_start")
    .eq("invite_code", code)
    .maybeSingle();

  if (ownerErr) return jsonError(500, "Erro buscando convite: " + ownerErr.message);
  if (!owner) return jsonError(404, "Codigo de convite invalido");
  if (owner.status !== "active") return jsonError(403, "Convite inativo");
  if (owner.plan !== "family_12m") {
    return jsonError(403, "Esse codigo nao da acesso gratis. So pacotes 12 meses oferecem cortesia.");
  }
  if (guestEmail === owner.owner_email) {
    return jsonError(400, "Voce nao pode usar seu proprio convite");
  }

  // Verifica se ja existe familia desse email
  const { data: existingFamily } = await supa
    .from("families")
    .select("id, status")
    .eq("owner_email", guestEmail)
    .maybeSingle();

  let guestFamilyId: string;

  if (existingFamily) {
    // Ja tem familia — checa se ja tá vinculada
    const { data: existingLink } = await supa
      .from("family_links")
      .select("id")
      .eq("owner_family_id", owner.id)
      .eq("guest_family_id", existingFamily.id)
      .maybeSingle();
    if (existingLink) {
      return jsonError(409, "Voce ja esta vinculado a essa viagem.");
    }
    guestFamilyId = existingFamily.id;

    // Atualiza familia existente pra estender acesso ate owner.access_until
    await supa.from("families").update({
      status: "active",
      access_until: owner.access_until,
      paid_at: new Date().toISOString(),
    }).eq("id", guestFamilyId);
  } else {
    // Cria familia nova
    const { data: created, error: createErr } = await supa
      .from("families")
      .insert({
        name: "Família Convidada",
        owner_email: guestEmail,
        plan: "guest_free",   // marca como guest gratis
        paid_at: new Date().toISOString(),
        trip_start: owner.trip_start,
        access_until: owner.access_until,
        status: "active",
      })
      .select("id")
      .single();
    if (createErr) return jsonError(500, "Erro criando familia: " + createErr.message);
    guestFamilyId = created.id;
  }

  // Cria vinculo
  const { error: linkErr } = await supa
    .from("family_links")
    .insert({
      owner_family_id: owner.id,
      guest_family_id: guestFamilyId,
      permission: "view",
    });
  if (linkErr && !linkErr.message.includes("duplicate")) {
    console.error("[register-free-guest] family_link error", linkErr);
  }

  // Adiciona ao allowed_users
  await supa.from("allowed_users").upsert({
    email: guestEmail,
    name: "Convidado",
    role: "admin",  // admin da propria familia (nao do sistema)
    status: "active",
    family_id: guestFamilyId,
  }, { onConflict: "email" });

  // Atualiza invites_sent (marca como convertido se existe)
  await supa.from("invites_sent")
    .update({ status: "converted", converted_at: new Date().toISOString() })
    .eq("owner_family_id", owner.id)
    .eq("guest_email", guestEmail)
    .eq("status", "sent");

  // Dispara magic link pra ele logar no app
  const magicRes = await fetch(SUPABASE_URL + "/auth/v1/otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: "Bearer " + SERVICE_KEY,
    },
    body: JSON.stringify({
      email: guestEmail,
      options: { emailRedirectTo: "https://minhaorlando.com.br/app/" },
    }),
  });

  if (!magicRes.ok) {
    const err = await magicRes.text();
    console.error("[register-free-guest] magic link error", err);
    // Nao fail — familia ja foi criada, so loga
  }

  return new Response(JSON.stringify({
    ok: true,
    family_id: guestFamilyId,
    sent_magic_link: magicRes.ok,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS },
  });
});

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
