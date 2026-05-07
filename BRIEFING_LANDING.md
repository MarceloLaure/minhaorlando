# Briefing — Landing Page Minha Orlando

> Cole esse arquivo inteiro no início da conversa com Claude Design (ou
> qualquer outra AI de design) quando for criar/atualizar a landing.
> Anexe também o `index.html` atual da raiz como referência visual.

---

## 1. Sobre o produto

**Minha Orlando** é um PWA (Progressive Web App) **pago** para famílias
brasileiras que vão visitar Orlando — Walt Disney World, Universal,
SeaWorld, Busch Gardens, Aquatica e Epic Universe. Tudo em um só lugar.

**Funcionalidades reais (números concretos):**
- **10 parques** integrados (Magic Kingdom, EPCOT, Hollywood Studios,
  Animal Kingdom, Universal Studios, Islands of Adventure, Epic Universe,
  Volcano Bay, SeaWorld, Busch Gardens)
- **107 atrações** com altura mínima validada por membro da família
- **50+ restaurantes** (cardápio, reviews resumidas pela IA, kid-friendly,
  reservas)
- **Filas em tempo real** (atualização a cada 5min, via queue-times.com)
  + histórico de picos por hora
- **Pixie IA** (GPT-4o-mini com web search) — monta roteiro do dia
  considerando filas, clima, altura das crianças, distância entre atrações
- **Família com altura** — filtra automaticamente quem pode em qual
  brinquedo (ex: "Theo 97cm não pode: Space Mountain, TRON, Rip Ride...")
- **Despesas compartilhadas** com OCR de cupom (foto → IA extrai itens)
  e câmbio BRL/USD ao vivo
- **Clima 7 dias** + horário detalhado (Open-Meteo)
- **PWA offline** (instala como app nativo, funciona dentro do parque
  mesmo sem internet)
- **Magic link sem senha** (login só por e-mail)
- **24 dias** de itinerário exemplo (13/09→06/10/2026)

## 2. Objetivo da landing

**Vender o app para famílias brasileiras indo a Orlando em 2026.**

Tráfego virá de Instagram, TikTok, Google e indicações boca a boca —
**maioria mobile**.

**Conversão = clique em "Entrar na fila com 15% OFF"** (modal de waitlist)
durante a fase pré-lançamento, depois muda pra "Garantir minha viagem"
(checkout Kiwify).

## 3. Estrutura do projeto no servidor

```
public_html/                   ← raiz do domínio minhaorlando.com.br
├── .htaccess                  ← config Apache (NÃO MEXER)
├── index.html                 ← AQUI vai a landing (substitui o atual)
├── app/                       ← O app PWA (NÃO MEXER)
│   ├── index.html
│   ├── config.js
│   ├── manifest.json
│   ├── service-worker.js
│   ├── icon-192.png, icon-512.png, pixie.png, castle.png
└── supabase/                  ← Edge Functions + SQL (não público)
    ├── functions/
    │   ├── pixie-chat/
    │   ├── kiwify-webhook/    ← processa pagamentos
    │   └── ...
    └── sql/
        ├── waitlist.sql       ← captura emails da fila
        └── subscriptions.sql  ← schema de assinaturas
```

Local Windows: `c:\MinhaOrlando\` segue a mesma estrutura.

**Deploy:** edita o `c:\MinhaOrlando\index.html` → `git add . && git commit && git push`
→ no painel da Hostinger, clica "Deploy" → site atualizado.

## 4. Restrições técnicas (importantes!)

- **UM ÚNICO arquivo HTML.** CSS inline em `<style>`, JS inline.
- **SEM React, SEM Vue, SEM build step, SEM Tailwind config.**
  Vanilla CSS é preferível pra performance.
- **SEM service worker** (só o app em `/app/` registra SW, scope `/app/`).
- **SEM dependências pesadas.** Pode usar Google Fonts e ícones inline (SVG).
- **Mobile-first.** Tudo perfeito de 360px até 1920px.
- **Performance crítica.** Carregamento abaixo de 1s no 4G.
- **CTAs principais abrem MODAL DE WAITLIST** (não vão direto pra `/app/`).
  Após o lançamento real, mudaremos pra checkout Kiwify.

## 5. Identidade visual

### Paleta
```css
--navy-deep:    #0B1B3A;   /* fundo escuro principal */
--navy-royal:   #1E3A8A;   /* theme color */
--blue-bright:  #3B82F6;
--gold:         #FCD34D;   /* CTA primário */
--gold-deep:    #F59E0B;
--pink:         #F472B6;
--purple:       #A78BFA;
--white:        #FFFFFF;
--gray-light:   #F8FAFC;
--gray-mid:     #94A3B8;
```

**Gradientes assinatura:**
- Hero: `linear-gradient(135deg, #0B1B3A 0%, #1E3A8A 55%, #3B82F6 100%)`
- Texto destaque: `linear-gradient(90deg, #FCD34D, #F472B6, #A78BFA)`
- CTA dourado: `linear-gradient(135deg, #FCD34D, #F59E0B)`

### Tipografia (Google Fonts)
- **Corpo:** `Plus Jakarta Sans` (400, 500, 600, 700, 800, 900)
- **Títulos:** `Fraunces` (serif, 700, 900) — ar premium/editorial

### Vibe
**Mágico mas profissional.** Disney encantador sem infantilizar.
Lembra apps premium de viagem (Hopper, Airbnb, Skyscanner) com toque
de fantasia. Estrelas piscando, gradientes suaves, glassmorphism.
Emojis com moderação (🏰 ✨ 🎢).

### Assets disponíveis
- `/app/icon-192.png` (192×192) — ícone azul com castelo
- `/app/icon-512.png` (512×512)
- `/app/castle.png` — silhueta branca de castelo, fundo transparente
- `/app/pixie.png` — mascote da IA (Stitch lilás de olhos grandes)

---

## 6. PRICING (importante! atualizado)

Modelo: **pague o pacote completo da viagem de uma vez**. SEM assinatura
recorrente. Brasileiro adora "PIX e tá resolvido".

### Pacotes Família (ESCOLHA do cliente — 3 tiers)

Cálculo: licença R$ 57,70 + (R$ 17,90 × meses)

| Pacote | Total à vista | Benefício de grupo |
|---|---|---|
| **3 meses** | **R$ 111,40** | Sem desconto pra convidados |
| **6 meses** ⭐ | **R$ 165,10** | Convidados pagam **50% OFF** |
| **12 meses** 🔥 | **R$ 272,50** | **Convidados de GRAÇA** |

> 12 meses = killer deal. Família que convida outras famílias paga vez única
> e libera todo o grupo grátis. Posicionar como "pacote pra grupos viajando junto".

### Acessos Convidado (família convidada compra à parte)

- **Convidado 3 meses** — R$ 53,70 (ativo se owner = qualquer pacote)
- **Convidado 6 meses (50% OFF)** — R$ 53,70 (ativo se owner = 6m ou 12m)
- **Convidado 12m owner** = automaticamente grátis (não vende no Kiwify,
  ativa direto no app via invite_code)

### Preços de lançamento (vs preços cheios — strikethrough na landing)

| | Cheio | Lançamento | Economia |
|---|---|---|---|
| Licença | ~~R$ 277,60~~ | **R$ 57,70** | -79% |
| Mensalidade | ~~R$ 34,90/mês~~ | **R$ 17,90/mês** | -49% |

**Mostrar preços com `<s>strikethrough</s>` no preço cheio + selo
"Preço de lançamento". Comunica urgência e valor real.**

### Argumento de valor

Uma viagem pra Orlando custa em média **R$ 30.000** pra família de 4.
O Minha Orlando custa **menos de 0,4% disso** (Pacote 3m / R$ 111,40)
e protege o investimento de mil decisões ruins.

---

## 7. Estado da landing — fase de pré-lançamento

**AGORA (pré-lançamento):**
- CTAs principais → abrem **modal de waitlist** (capturam email + mês da
  viagem)
- Promessa: "te avisamos quando o app abrir + cupom **15% OFF** travado
  no preço de lançamento"
- Backend já está pronto: `POST /rest/v1/waitlist` no Supabase grava
  `{email, trip_date, source: 'landing'}`

**DEPOIS (lançamento real):**
- CTAs principais → vão direto pro **checkout Kiwify** do pacote escolhido
- Página `/convite/[code]` valida invite_code e redireciona pro checkout
  do "Acesso Convidado" com `tracking_param=[code]`
- Não precisamos mexer agora — basta deixar a estrutura preparada com
  data attributes claras (ex: `data-checkout="family_6m"`)

---

## 8. Estrutura de seções sugerida (atualizada)

1. **Hero**
   - Headline com gradiente dourado-rosa-roxo
   - Subtítulo focado no problema
   - CTA primário "Entrar na fila com 15% OFF" → abre modal
   - Linha de prova: "✨ Vagas limitadas no preço de lançamento · sem cartão"

2. **A dor** (problema)
   - "Planejar Orlando dá trabalho" (filas, mapa confuso, criança não
     passa altura, refeição R$ 400 errada, perder ingresso, etc.)
   - 3 cards de pain point com ícones

3. **Como funciona** (4 features)
   - Pixie IA (com mockup de chat)
   - Família com altura (com mockup mostrando "podem/não podem")
   - Filas tempo real (com mockup de gráfico de fila)
   - Plano dia-a-dia (com mockup de calendário)

4. **Pixie IA destaque**
   - Bloco grande com a mascote
   - Exemplo de conversa real ("monta meu dia") → resposta da IA com
     blocos "Agora", "Próxima 1h", "Almoço", etc.

5. **Lista de parques cobertos**
   - Grid com nomes dos 10 parques (texto, sem logos pra evitar trademark)

6. **Pra quem é**
   - 3 personas: família 1ª viagem · família com filhos pequenos
     (altura) · família com grupo grande

7. **Investimento** (PRICING)
   - Banner urgência: "🔥 Preço de lançamento — entre na fila com 15% OFF"
   - 3 cards lado a lado: 3m / 6m / 12m
     - Cada card mostra: preço cheio (strikethrough) + preço lançamento
       em destaque + benefício de grupo
   - 6m com badge "MAIS POPULAR", 12m com badge "GRUPO GRÁTIS 🔥"
   - Linha fina: "Família convidada paga só R$ 53,70 (6m) ou R$ 0 (12m)"
   - CTA central → abre modal de waitlist

8. **FAQ** (com schema FAQPage pro AEO)
   - Quanto custa?
   - Posso cancelar?
   - Funciona offline?
   - Filas são em tempo real mesmo?
   - Posso convidar outra família?
   - Pixie IA entende altura/restrições?

9. **CTA final grande**
   - Banner com gradiente
   - Headline + sub
   - CTA "Entrar na fila com 15% OFF"

10. **Footer**
    - Email contato@minhaorlando.com.br
    - Links Privacidade / Termos (placeholder #)
    - Copyright

---

## 9. Modal de waitlist (já implementado, manter funcional)

A landing atual já tem o modal funcionando. Estrutura:

```html
<div class="wl-overlay" id="wl-overlay">
  <div class="wl-card">
    <button id="wl-close">×</button>
    <!-- Form view -->
    <div id="wl-form-view">
      <div class="wl-badge">🔥 15% OFF · vagas limitadas</div>
      <h3>Entre na fila do lançamento</h3>
      <p>Te avisamos por email quando o app abrir, com cupom 15% OFF.</p>
      <form id="wl-form">
        <input type="email" id="wl-email" required/>
        <input type="month" id="wl-trip" min="2026-01" max="2030-12"/>
        <button type="submit">Garantir minha vaga →</button>
      </form>
    </div>
    <!-- Success view -->
    <div id="wl-success-view" style="display:none;">
      <div>✨</div>
      <h3>Tá na fila!</h3>
      <p>Te mando email assim que o app abrir, com cupom 15% OFF.</p>
    </div>
  </div>
</div>
```

JS faz POST pra `https://ujnazpcffceuyctnnoip.supabase.co/rest/v1/waitlist`
com headers `apikey` + `Authorization: Bearer [anon]`. Body:
```json
{
  "email": "user@email.com",
  "trip_date": "2026-09-01",
  "source": "landing",
  "user_agent": "...",
  "referrer": "..."
}
```

CTAs com `data-open-form` abrem o modal.

**Pode redesenhar visualmente o modal mas MANTÉM:**
- Mesmo endpoint Supabase
- Mesmo formato de payload
- Trata 409 (email duplicado) como sucesso silencioso
- View de sucesso quando POST passa

---

## 10. Restrições de conteúdo

- **NÃO inventar números** ("+5.000 famílias"). Marcar `[PLACEHOLDER]`
  se precisar de prova social numérica.
- **NÃO criar depoimentos falsos.** Marcar `[colar depoimento real]`.
- **NÃO usar logos oficiais** de Disney/Universal/SeaWorld (trademark).
  Listar parques só por nome (texto).
- **NÃO usar imagens reais dos parques** (direitos autorais). Usar
  ilustrações originais ou os assets disponíveis.
- **Email contato:** `contato@minhaorlando.com.br`
- **Idioma:** PT-BR, sem "tu", usar "você". Sem corporate bullshit
  ("revolucione", "transforme sua experiência" — JAMAIS).
- **Tom:** empático ("a gente sabe como dá trabalho planejar Orlando"),
  concreto, específico.

## 11. SEO + AEO obrigatórios

- `<title>` ~60 chars
- `<meta name="description">` ~155 chars
- Open Graph tags (og:title, og:description, og:image, og:type)
- Twitter Card
- `<link rel="canonical">`
- `<html lang="pt-BR">`
- JSON-LD: `SoftwareApplication` + `FAQPage` + `Organization` + `Offer`
  (price: 57.70, priceCurrency: BRL)
- Heading hierarchy correta (1 H1, múltiplos H2/H3)
- Alt em todas as imagens
- aria-labels em botões
- Lighthouse alvo: 95+ em todas as métricas

---

## 12. Prompt pronto pra Claude Design (com codebase attach)

Cole isso no Claude Design depois de anexar o codebase
(`c:\MinhaOrlando\` inteira):

```
Voce tem acesso ao meu codebase. Antes de gerar:

1. Le BRIEFING_LANDING.md (esse arquivo) — paleta, pricing, restricoes
2. Olha o index.html atual da raiz pra ver a vibe visual e o modal
   de waitlist ja funcionando
3. Olha app/index.html pra entender o produto

CONTEXTO IMPORTANTE:
- App nao e gratuito mais. Modelo de pagamento e pacote pre-pago
  (R$ 111,40 / R$ 165,10 / R$ 272,50 — 3/6/12 meses)
- Lancamento ainda nao aconteceu. Landing atual captura emails na
  waitlist com promessa de 15% OFF
- Precos de lancamento (R$ 57,70 + R$ 17,90/mes) vs preco cheio
  (R$ 277,60 + R$ 34,90/mes) — mostrar com strikethrough no cheio
- Pacote 12m da convidados de graca, 6m da convidados 50% OFF — destaque
  o 12m como killer deal pra grupos
- Backend ja existe: webhook Kiwify processando pagamentos, schema
  de assinaturas no Supabase. Landing so precisa capturar email e
  preparar o terreno

OBJETIVO: aumentar conversao na waitlist (email submission) +
deixar a landing pronta pra trocar CTA pra checkout Kiwify quando
lancarmos.

REQUISITOS:
- 1 unico HTML, CSS inline, sem build, sem React
- Mobile-first 360-1920px
- SEO completo (title, meta, OG, JSON-LD SoftwareApplication+FAQPage)
- Mantem o modal de waitlist funcional (mesmo endpoint Supabase)
- Sem service worker
- Lighthouse 95+

ENTREGA: substitui index.html da raiz. Um arquivo completo.

Antes de codar, mostra:
A) 3 direcoes de hero (1 frase cada)
B) Estrutura de secoes proposta
C) Como vai mostrar os 3 pacotes de pricing (layout)

Aih eu escolho e voce executa.
```
