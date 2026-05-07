// Edge Function: send-invite
// Manda email de convite pra outra familia entrar na viagem do owner.
//
// Variaveis de ambiente necessarias (configurar via Supabase Secrets):
// - RESEND_API_KEY: api key do https://resend.com (obrigatoria)
// - FROM_EMAIL: opcional. Default: 'Minha Orlando <noreply@minhaorlando.com.br>'
//
// Manter "Verify JWT" ATIVADO no deploy — usuario logado precisa estar
// autenticado pra convidar (caso contrario qualquer um convidaria).

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "Minha Orlando <noreply@minhaorlando.com.br>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const PLAN_TO_OFFER: Record<string, { discountText: string; benefitText: string }> = {
  family_3m: {
    discountText: "Acesso por 3 meses por <strong>R$ 53,70</strong>",
    benefitText: "valor cheio pra convidados (sem desconto especial nesse pacote)",
  },
  family_6m: {
    discountText: "Acesso por 6 meses com <strong>50% OFF</strong> — R$ 53,70 (ao invés de R$ 107,40)",
    benefitText: "metade do preço porque a família anfitriã tem o pacote 6 meses",
  },
  family_12m: {
    discountText: "Acesso <strong>100% GRÁTIS</strong> por 12 meses",
    benefitText: "cortesia total — a família anfitriã tem o pacote 12 meses (grupo grátis)",
  },
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return jsonError(405, "Method not allowed");
  if (!RESEND_API_KEY) return jsonError(500, "RESEND_API_KEY nao configurado");

  // Valida JWT do user autenticado
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return jsonError(401, "Missing authorization");
  const jwt = auth.slice(7);

  const supaAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: { user }, error: userErr } = await supaAuth.auth.getUser();
  if (userErr || !user || !user.email) return jsonError(401, "Token invalido");
  const userEmail = user.email.toLowerCase().trim();

  // Parse body
  let body: any;
  try { body = await req.json(); }
  catch { return jsonError(400, "Invalid JSON"); }

  const guestEmail = (body.guest_email || "").toLowerCase().trim();
  const customMessage = (body.message || "").toString().slice(0, 500);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
    return jsonError(400, "Email do convidado invalido");
  }
  if (guestEmail === userEmail) {
    return jsonError(400, "Voce nao pode convidar a si mesmo");
  }

  // Service client (bypassa RLS)
  const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // Pega familia do usuario (owner ativo)
  const { data: family, error: famErr } = await supa
    .from("families")
    .select("id, name, owner_email, plan, status, access_until, invite_code")
    .eq("owner_email", userEmail)
    .maybeSingle();

  if (famErr) return jsonError(500, "Erro buscando familia: " + famErr.message);
  if (!family) return jsonError(404, "Sua familia nao foi encontrada. Voce precisa ter uma assinatura ativa.");
  if (family.status !== "active") return jsonError(403, "Sua familia nao esta ativa.");
  if (!family.invite_code) return jsonError(500, "Codigo de convite ausente — contate suporte.");
  // So permite convite vindo de familias com plano family_* (anfitriao pagante)
  // Familias guest_* nao podem convidar (sao convidadas elas mesmas)
  if (!family.plan || !family.plan.startsWith("family_")) {
    return jsonError(403, "Familias convidadas nao podem enviar convites. Apenas o anfitriao da viagem convida.");
  }

  // Verifica se ja existe family link pra esse email (familia ja vinculada)
  const { data: existingGuest } = await supa
    .from("families")
    .select("id, status")
    .eq("owner_email", guestEmail)
    .maybeSingle();
  if (existingGuest) {
    const { data: link } = await supa
      .from("family_links")
      .select("id")
      .eq("owner_family_id", family.id)
      .eq("guest_family_id", existingGuest.id)
      .maybeSingle();
    if (link) return jsonError(409, "Essa familia ja esta vinculada a sua viagem.");
  }

  // Anti-spam: max 5 convites na ultima hora
  const oneHourAgo = new Date(Date.now() - 3600e3).toISOString();
  const { count } = await supa
    .from("invites_sent")
    .select("id", { count: "exact", head: true })
    .eq("owner_family_id", family.id)
    .gte("sent_at", oneHourAgo);
  if ((count || 0) >= 5) {
    return jsonError(429, "Muitos convites na ultima hora (max 5). Aguarde antes de convidar mais.");
  }

  // Anti-duplicata: mesmo email nao recebe 2 convites em 24h
  const oneDayAgo = new Date(Date.now() - 86400e3).toISOString();
  const { data: dup } = await supa
    .from("invites_sent")
    .select("id")
    .eq("owner_family_id", family.id)
    .eq("guest_email", guestEmail)
    .gte("sent_at", oneDayAgo)
    .maybeSingle();
  if (dup) return jsonError(409, "Voce ja convidou esse email nas ultimas 24h.");

  // Monta o email
  const inviteUrl = `https://minhaorlando.com.br/convite/${family.invite_code}`;
  const offer = PLAN_TO_OFFER[family.plan] || PLAN_TO_OFFER.family_3m;
  const ownerName = (family.name || "Família").replace(/^Família\s+/i, "");
  const accessUntilFmt = family.access_until
    ? new Date(family.access_until + "T00:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : "fim da viagem";

  const html = renderInviteHtml({
    ownerName,
    inviteUrl,
    discountText: offer.discountText,
    benefitText: offer.benefitText,
    accessUntilFmt,
    customMessage,
  });

  // Envia via Resend
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [guestEmail],
      reply_to: userEmail,
      subject: `${ownerName} te convidou pra viagem em Orlando ✨`,
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[send-invite] Resend error", res.status, errText);
    return jsonError(502, "Erro enviando email: " + errText);
  }

  // Log no banco
  await supa.from("invites_sent").insert({
    owner_family_id: family.id,
    guest_email: guestEmail,
    invite_code: family.invite_code,
    status: "sent",
  });

  return new Response(JSON.stringify({ ok: true, sent_to: guestEmail }), {
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

function renderInviteHtml(p: {
  ownerName: string;
  inviteUrl: string;
  discountText: string;
  benefitText: string;
  accessUntilFmt: string;
  customMessage: string;
}) {
  const e = (s: string) => String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Convite — Minha Orlando</title>
</head>
<body style="margin:0;padding:0;background:#0B1B3A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0B1B3A;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#11213f;border:1px solid #1f3458;border-radius:24px;overflow:hidden;">
        <tr><td align="center" style="padding:40px 32px 24px;">
          <div style="font-size:42px;margin-bottom:12px;">🏰✨</div>
          <p style="margin:0 0 8px;color:#FCD34D;font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Convite especial</p>
          <h1 style="margin:0;color:#F8FAFC;font-size:26px;font-weight:900;line-height:1.3;letter-spacing:-.5px;">
            <strong>${e(p.ownerName)}</strong> te convidou pra<br/>viagem em <span style="color:#FCD34D;">Orlando 2026</span>
          </h1>
        </td></tr>
        <tr><td style="padding:0 32px 24px;color:#B8C2D9;font-size:15px;line-height:1.6;">
          <p style="margin:0 0 18px;">A família ${e(p.ownerName)} tá montando o roteiro completo pra Orlando no <strong>Minha Orlando</strong> — o app com filas em tempo real, Pixie IA, plano dia-a-dia e despesas compartilhadas.</p>
          ${p.customMessage ? `<div style="margin:0 0 18px;padding:14px 16px;border-left:3px solid #FCD34D;background:rgba(252,211,77,.08);border-radius:8px;font-style:italic;color:#F8FAFC;">"${e(p.customMessage)}"</div>` : ""}
          <p style="margin:18px 0 8px;color:#7B88A8;font-size:12px;text-transform:uppercase;letter-spacing:.06em;font-weight:800;">Sua oferta:</p>
          <p style="margin:0;color:#F8FAFC;font-size:18px;font-weight:700;line-height:1.4;">${p.discountText}</p>
          <p style="margin:8px 0 0;color:#7B88A8;font-size:13px;">${e(p.benefitText)}. Acesso garantido até ${e(p.accessUntilFmt)}.</p>
        </td></tr>
        <tr><td align="center" style="padding:8px 32px 36px;">
          <a href="${e(p.inviteUrl)}" style="display:inline-block;padding:16px 32px;border-radius:14px;background:linear-gradient(135deg,#FCD34D,#F59E0B);color:#0B1B3A;text-decoration:none;font-weight:800;font-size:15px;letter-spacing:.02em;">Aceitar convite →</a>
        </td></tr>
        <tr><td style="padding:24px 32px;background:rgba(255,255,255,.03);border-top:1px solid #1f3458;">
          <p style="margin:0;color:#7B88A8;font-size:12px;line-height:1.5;text-align:center;">
            Esse convite é pessoal. Se você não conhece ${e(p.ownerName)}, pode ignorar este email.<br/>
            Minha Orlando · planejador de viagens · contato@minhaorlando.com.br
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
