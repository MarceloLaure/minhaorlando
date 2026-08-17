# Minha Orlando — Trip Planner 2026

PWA da família pra organizar a viagem a Orlando em 2026. Roda em qualquer navegador moderno e instala no celular como app nativo. URL de produção: https://minhaorlando.com.br/

---

## O que o app faz

- **Home** com saudação personalizada, contagem regressiva pré-viagem, foto de capa da família, atrações com filas em tempo real e cards de resumo (despesas, câmbio, clima, próxima fila).
- **Plano** dia-a-dia com itinerário arrastável, parques, restaurantes, endereços com link pro Google Maps.
- **Mapa** dos parques de Orlando com seleção por complexo (Disney World, Universal, SeaWorld, Busch Gardens).
- **Atração detalhada** com foto, picos históricos de fila (snapshots reais armazenados no Supabase), restaurantes próximos e atrações relacionadas.
- **Restaurantes** dentro/fora dos parques com filtro por cozinha, preço, kid-friendly e reservas.
- **Família** com cadastro de membros, vínculo a usuários autorizados e foto compartilhada.
- **Despesas** com OCR de cupom via OpenAI (foto da nota → preenchimento automático), escopo pessoal/grupo e split tracking.
- **Clima** próximos dias via Open-Meteo, com alertas dentro do chat da Pixie.
- **Pixie (IA)** — assistente da viagem rodando em GPT-4o-mini com contexto rico (família, itinerário, filas, despesas, clima).
- **Auth** por Acesso Livre (email direto) ou magic link via Supabase, com allowlist de e-mails.
- **Admin** pra gerenciar a allowlist e cadastrar locais novos.

---

## Stack

- **Front:** HTML único + React (via CDN) + Babel standalone (transforma JSX no browser, sem build step).
- **PWA:** service worker próprio, manifest, install prompt, kill switch via `?reset`.
- **Backend:** [Supabase](https://supabase.com) — Postgres com RLS, Storage pra fotos, Edge Functions (Deno), pg_cron + pg_net pra agendamentos.
- **APIs externas:**
  - [queue-times.com](https://queue-times.com) — filas dos parques (via Edge Function de proxy, evita CORS)
  - [open-meteo.com](https://open-meteo.com) — clima (sem chave)
  - [exchangerate-api.com](https://exchangerate-api.com) — USD/BRL (sem chave)
  - [OpenAI](https://platform.openai.com) — GPT-4o-mini pro chat e GPT-4o pra OCR (via Edge Function)
- **Hosting:** [Hostinger](https://hostinger.com) com auto-deploy via webhook do GitHub.
- **Email:** SMTP do [Resend](https://resend.com) configurado dentro do Supabase Auth (corrige rate limit do magic link).

Sem `npm install`, sem `node_modules`, sem build. Tudo roda direto do navegador.

---

## Estrutura do repo

```
.
├── index.html          ← entrega tudo: PWA bootstrap + bundler + assets
├── config.js           ← URL e anon key do Supabase (legacy JWT)
├── service-worker.js   ← cache do app shell, network-first pra HTML
├── manifest.json       ← PWA manifest
├── icon-192.png        ← ícone PWA
├── icon-512.png        ← ícone PWA
├── pixie.png           ← avatar da Pixie (256px)
├── castle.png          ← logo do TopBar (128px)
├── README.md
└── .gitignore
```

A pasta `.tmp/` (gitignored) é usada como workspace pra extrair/editar/re-empacotar bundles JSX.

---

## Como o `index.html` funciona

O arquivo tem ~1.6 MB e contém:

1. **`<head>`** com tags PWA, meta theme-color, links pros ícones e o `manifest.json`.
2. **Bootstrap script (~linha 70-200)** — registra o service worker, captura o `beforeinstallprompt`, monta o botão "Instalar", e implementa o kill switch `?reset` (limpa caches, SW, localStorage e recarrega).
3. **`<script type="__bundler/manifest">` (linha 201)** — JSON gigante com todos os assets do app. Cada entrada é:
   ```json
   "uuid": { "mime": "...", "compressed": true, "data": "<base64 de gzip>" }
   ```
4. **`<script type="__bundler/template">`** — HTML template que vai virar o `<html>` do app real. Referencia os UUIDs como placeholders.
5. **Loop final** — pra cada UUID: `atob(data) → DecompressionStream('gzip') → Blob → URL.createObjectURL`. Substitui os placeholders no template pelos blob URLs e troca `document.documentElement` pelo template renderizado. Re-cria os `<script>` com `createElement` (DOMParser deixa scripts inertes) e força o Babel a re-transformar tudo que tem `type="text/babel"` ou `type="text/jsx"`.

### Bundles principais

| UUID prefix | Conteúdo |
|---|---|
| `7e22a8a9` | React dev (CDN bundle) |
| `f5bb10ba` | regenerator-runtime (pro async/await do Babel) |
| `5007fa75` | Ícones, helpers de UI, theme tokens |
| `1135057b` | `PARKS` array, `ORLANDO_THEMES`, fontes |
| `51f48dda` | `OrlandoAPIs` (clima, câmbio, queue-times) + `ATTRACTIONS` + `RESTAURANTS` + `ITINERARY` |
| `6d75937b` | `SupabaseAPI` (REST client custom — evita lib JS por causa do problema da publishable key com Edge Functions) |
| `a20ca9d8` | Telas de auth + admin allowlist |
| `01d2bbc5` | HomeScreen, FamilyScreen, PlanScreen |
| `8a0f8847` | MapScreen, AttractionDetail, RestaurantsScreen |
| `518007d9` | WeatherScreen, ChatScreen (Pixie), ExpensesScreen |
| `d1a75054` | Componente App principal — auth, navegação, TopBar, PixieFAB |
| Vários WOFF2 | Fontes |

---

## Como editar uma tela

O JSX está dentro do bundle gzipado/base64 do `index.html`, então não dá pra editar direto. O fluxo é:

1. **Extrair** o bundle alvo pra um arquivo `.jsx` em `.tmp/`:

   ```powershell
   # extract_one.ps1 já existe em .tmp/ — ele descompacta o gzip do UUID e salva como texto
   powershell -ExecutionPolicy Bypass -File .tmp/extract_one.ps1 `
     -Uuid 01d2bbc5-34c0-4e36-ad56-4e17f4fb110a `
     -OutFile .tmp/01d2bbc5.jsx
   ```

2. **Editar** o `.jsx` extraído com qualquer editor.

3. **Re-empacotar** de volta no `index.html`:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .tmp/rebundle_one.ps1 `
     -Uuid 01d2bbc5-34c0-4e36-ad56-4e17f4fb110a `
     -InFile .tmp/01d2bbc5.jsx
   ```

   O script encontra a linha do manifest (linha 201), substitui o `data` do UUID pelo novo gzip+base64, preserva LF e UTF-8 sem BOM.

4. **Bumpar a versão do cache** em `service-worker.js` (`CACHE_VERSION = 'vXX'`). Sem isso o SW continua servindo o HTML antigo.

5. **Commit + push** — o auto-deploy do Hostinger (ver abaixo) coloca em produção em ~30s.

6. **Testar com `?reset`** na URL pra forçar invalidação do SW antigo no seu navegador.

---

## Auto-deploy (GitHub → Hostinger)

O Hostinger tem **Git Auto-Deploy** ativado apontando pra `main` deste repo. O fluxo:

```
git push origin main
  ↓
GitHub webhook dispara
  ↓
Hostinger pulls main no diretório do site
  ↓
Arquivos servidos diretamente pelo Apache do Hostinger
  ↓ (~30s depois)
https://minhaorlando.com.br/ atualizado
```

Não tem build, não tem CI. O que está em `main` é literalmente o que está em produção.

### Cache busting

O service worker (`service-worker.js`) usa **Network First** pra HTML/navegação e **Stale While Revalidate** pra assets. Mesmo assim, navegadores podem servir HTML cacheado.

Toda alteração visual deve:

1. Bumpar `CACHE_VERSION` no `service-worker.js` (v1 → v2 → ...). O número não importa, só precisa **mudar**.
2. Adicionar arquivos novos ao `APP_SHELL` se forem essenciais pra primeira pintura.

Pra forçar um cliente a pegar a nova versão imediatamente: `https://minhaorlando.com.br/?reset` — o bootstrap detecta o param e:
- Desregistra todos os service workers
- Limpa `caches.keys()`
- Limpa `localStorage` e `sessionStorage`
- Recarrega na URL limpa

---

## Backend (Supabase)

URL: `https://ujnazpcffceuyctnnoip.supabase.co` (config em `config.js`).

### Tabelas principais

- `allowed_users` — allowlist de e-mails pra magic link
- `login_attempts` — log de logins por Acesso Livre, usado pro rate limit
- `families` — uma por viagem; tem `photo_url` (foto do hero)
- `family_members` — membros vinculados (opcionalmente) a `auth_user_id`
- `expenses` — despesas com `scope` (`personal`/`group`), `paid_by`, `receipt_url`, `split_with[]`
- `itinerary` — entradas do plano (`type`: park/restaurant/transit/...), com `address`, `google_maps_url`
- `places` — catálogo extra de lugares (categoria, foto, nota)
- `attraction_photos` — fotos custom das atrações (uploads dos usuários)
- `queue_snapshots` — snapshots horários de filas pro histórico de picos

### Edge Functions

- `queue-times-proxy` — proxy CORS pra `queue-times.com/parks/{id}/queue_times.json`
- `pixie-chat` — chat com OpenAI (gpt-4o-mini), recebe contexto rico
- `receipt-ocr` — OCR de cupom com gpt-4o vision, devolve JSON estruturado
- `queue-snapshot-cron` — chamada por pg_cron a cada hora, faz snapshot das filas dos 9 parques
- `acesso-livre` — login direto por email, sem link mágico (ver abaixo)

Todas com **Verify JWT off** (são efetivamente públicas, mas o RLS do Supabase protege os dados).

### Acesso Livre

A tela de login (`/app` e `/acessadm`) tem dois botões: **🔓 Acesso Livre** (principal)
e "Prefiro receber o link mágico" (o fluxo antigo, intacto). No Acesso Livre:

1. Front chama a Edge Function `acesso-livre` com o email
2. A função (service_role) confirma `allowed_users.status = 'active'` e gera um
   token de magic link com `auth.admin.generateLink()` — **sem mandar email**
3. Browser troca o token por sessão real em `/auth/v1/verify`

⚠️ **Isso remove a prova de posse do email.** Quem souber o email de alguém da
allowlist entra na conta dessa pessoa. Foi uma escolha deliberada — o app é da
família e a base é pequena. Se a base crescer, reconsiderar.

**Pra desligar:** delete a Edge Function `acesso-livre` no Supabase. O botão passa
a dar "Acesso livre desligado — use o link mágico" e o fluxo antigo continua
funcionando normal, sem precisar de deploy do front.

**Pra tirar o acesso de alguém:** `update allowed_users set status = 'paused'`.
Vale pros dois fluxos de uma vez.

Tabela e cola de manutenção: `supabase/sql/acesso_livre.sql`.

### Por que JWT legacy e não publishable key

O Supabase introduziu `sb_publishable_*` keys que **não funcionam** com Edge Functions que têm Verify JWT desabilitado (a key não passa o validador interno). Por isso o `config.js` usa a anon key no formato JWT antigo (`eyJ...`). Se trocar pra publishable, todo o chat e OCR quebra.

---

## Variáveis de ambiente (Supabase secrets)

Configuradas via dashboard do Supabase em **Edge Functions → Secrets**:

- `OPENAI_API_KEY` — pro chat e OCR
- `OPENAI_MODEL` (opcional) — default `gpt-4o-mini`, pode trocar pra `gpt-4o`
- `CRON_SECRET` — token que `queue-snapshot-cron` exige (atualmente só ilustrativo, função tem Verify JWT off mesmo)

---

## Comandos úteis

```powershell
# Ver qual versão tá em produção
curl https://minhaorlando.com.br/service-worker.js | Select-String CACHE_VERSION

# Forçar reset no seu navegador
# abrir: https://minhaorlando.com.br/?reset

# Deploy manual (se o webhook quebrar)
# Hostinger → File Manager → Git → Pull (ou rodar git pull no SSH)
```

---

## Roadmap curto

- Sincronizar `currentDay` com o dia atual real durante a viagem
- Notificações push pra alertas de chuva e filas baixas
- Exportar plano final como PDF
- Modo offline completo (já funciona pra leitura, falta escrita assíncrona)
