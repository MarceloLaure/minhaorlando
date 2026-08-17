// Edge Function: acesso-livre
// Loga direto por email, sem link mágico.
//
// Fluxo:
//   1. Recebe { email }
//   2. Confirma que o email e allowed_users.status='active'
//   3. generateLink({type:'magiclink'}) — NAO manda email, so gera o token
//   4. Devolve { email, token_hash } — o browser troca por sessao em /auth/v1/verify
//
// ATENCAO: isso remove a prova de posse do email. Quem souber o email de
// alguem da allowlist entra na conta dessa pessoa. Foi uma escolha
// deliberada pro app da familia. Pra desligar: delete esta funcao — o
// botao passa a dar erro e o link magico continua funcionando normal.
//
// Rate limit: 10 emails NAO autorizados por IP a cada 5 min (trava varredura).
//
// IMPORTANTE: deployar com "Verify JWT" DESATIVADO — a chamada vem da
// tela de login, quando ainda nao existe sessao.
//
// Tabelas: supabase/sql/acesso_livre.sql

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

const MAX_FAILS = 10;      // emails fora da allowlist...
const WINDOW_MINUTES = 5;  // ...nessa janela, por IP

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return jsonError(405, "Method not allowed");

  let body: any;
  try { body = await req.json(); }
  catch { return jsonError(400, "Invalid JSON"); }

  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError(400, "Email invalido");
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || req.headers.get("cf-connecting-ip")
    || "unknown";

  const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // ── Rate limit: quantos emails errados esse IP ja tentou na janela ──
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { count: fails } = await supa
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .eq("ok", false)
    .gte("tried_at", since);

  if ((fails || 0) >= MAX_FAILS) {
    return jsonError(429, "Muitas tentativas. Espera uns minutos e tenta de novo.");
  }

  // ── Esta na allowlist? ──
  const { data: allowed, error: allowedErr } = await supa
    .from("allowed_users")
    .select("email, name, status")
    .eq("email", email)
    .eq("status", "active")
    .maybeSingle();

  if (allowedErr) return jsonError(500, "Erro validando acesso: " + allowedErr.message);

  if (!allowed) {
    await logAttempt(supa, ip, email, false);
    return jsonError(403, "Email nao autorizado. Peca um convite ao admin da viagem.");
  }

  // ── Gera o token de magic link (nao manda email nenhum) ──
  let token_hash = await generateHash(supa, email);

  // Pessoa autorizada mas que nunca logou nao tem linha em auth.users.
  // O fluxo normal de magic link cria na hora, entao criamos aqui tambem.
  if (!token_hash) {
    const { error: createErr } = await supa.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (createErr && !/already/i.test(createErr.message)) {
      return jsonError(500, "Erro criando conta: " + createErr.message);
    }
    token_hash = await generateHash(supa, email);
  }

  if (!token_hash) return jsonError(500, "Nao foi possivel gerar a sessao");

  await logAttempt(supa, ip, email, true);

  return new Response(
    JSON.stringify({ ok: true, email, name: allowed.name, token_hash }),
    { status: 200, headers: { ...CORS, "Content-Type": "application/json" } },
  );
});

async function generateHash(supa: any, email: string): Promise<string | null> {
  const { data, error } = await supa.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) return null;
  return data?.properties?.hashed_token || null;
}

async function logAttempt(supa: any, ip: string, email: string, ok: boolean) {
  try {
    await supa.from("login_attempts").insert({ ip, email, ok });
  } catch (_) { /* log nao pode derrubar o login */ }
}

function jsonError(status: number, message: string) {
  return new Response(
    JSON.stringify({ ok: false, error: message }),
    { status, headers: { ...CORS, "Content-Type": "application/json" } },
  );
}
