# Briefing — Landing Page Minha Orlando

> Cole esse arquivo inteiro no início da conversa com Claude (ou qualquer outra
> AI de design) quando for criar/atualizar a landing.
> Anexe também o `index.html` atual da raiz como referência visual.

---

## 1. Sobre o produto

**Minha Orlando** é um PWA (Progressive Web App) gratuito para famílias que
vão visitar Orlando — Walt Disney World, Universal, SeaWorld, Busch Gardens
e Aquatica. Tudo em um só lugar.

**Funcionalidades:**
- Filas em tempo real de todas as atrações (dado ao vivo via queue-times)
- IA "Pixie" que monta roteiro do dia baseado em filas + clima + família
- Cadastro da família com altura — mostra quem pode/não pode em cada brinquedo
- Plano de viagem dia-a-dia (parques, restaurantes, descanso)
- Restaurantes com cardápio, reviews resumidas pela IA, mapa
- Despesas compartilhadas com câmbio BRL/USD ao vivo
- Previsão do tempo dos próximos dias
- Funciona offline (PWA, instala na tela inicial do celular)

## 2. Objetivo da landing

**Vender o app para famílias brasileiras planejando ir a Orlando em 2026.**

Conversão = clique no botão "Acessar app" (vai pra `/app/`).

Tráfego virá de Instagram, TikTok, Google e indicações boca a boca —
**maioria mobile**.

## 3. Estrutura do projeto no servidor

```
public_html/                   ← raiz do domínio minhaorlando.com.br
├── .htaccess                  ← config Apache (NÃO MEXER)
├── index.html                 ← AQUI vai a landing nova (substitui o atual)
├── app/                       ← O app PWA (NÃO MEXER)
│   ├── index.html
│   ├── config.js
│   ├── manifest.json
│   ├── service-worker.js
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── pixie.png
│   └── castle.png
└── supabase/                  ← Edge Functions (não servido público)
```

Local Windows: `c:\MinhaOrlando\` segue a mesma estrutura.

**Deploy:** edita o `c:\MinhaOrlando\index.html` → `git add . && git commit && git push`
→ no painel da Hostinger, clica "Deploy" → site atualizado.

## 4. Restrições técnicas (importantes!)

- **UM ÚNICO arquivo HTML.** CSS inline em `<style>`, JS inline se necessário.
- **SEM React, SEM Vue, SEM build step, SEM Tailwind config.**
  Pode usar Tailwind via CDN se quiser, mas vanilla CSS é preferível pra performance.
- **SEM service worker** (só o app em `/app/` registra SW, scope `/app/`).
- **SEM dependências pesadas.** Pode usar Google Fonts e ícones inline (SVG).
- **Mobile-first.** Tudo tem que ficar perfeito de 360px até 1920px.
- **Performance é crítica.** Carregamento abaixo de 1s no 4G.
- **CTA principal leva pra `/app/`** (com a barra no final, importante pro PWA).

## 5. Identidade visual

### Paleta (igual o app — manter consistência)
```css
/* Fundo escuro premium */
--navy-deep:    #0B1B3A;
--navy-royal:   #1E3A8A;   /* theme color principal */
--blue-bright:  #3B82F6;

/* Destaques quentes */
--gold:         #FCD34D;   /* CTA primário */
--pink:         #F472B6;
--purple:       #A78BFA;

/* Neutros */
--white:        #FFFFFF;
--gray-light:   #F8FAFC;
--gray-mid:     #94A3B8;
```

**Gradientes assinatura:**
- Hero/fundo: `linear-gradient(135deg, #0B1B3A 0%, #1E3A8A 55%, #3B82F6 100%)`
- Texto destaque: `linear-gradient(90deg, #FCD34D, #F472B6, #A78BFA)`
- CTA dourado: `linear-gradient(135deg, #FCD34D, #F59E0B)`

### Tipografia (Google Fonts)
- **Corpo:** `Plus Jakarta Sans` (pesos 400, 600, 700, 800, 900)
- **Títulos:** `Fraunces` (serif, pesos 700, 900) — dá ar premium/editorial

### Vibe
**Mágico mas profissional.** Disney encantador sem ser infantil.
Lembra os apps premium de viagem (Hopper, Airbnb, Skyscanner) com toque
de fantasia. Estrelas piscando, gradientes suaves, blur glassmorphism.
Emojis com moderação (🏰 ✨ 🎢 — nunca infantilizar demais).

### Assets disponíveis (já no servidor)
- `/app/icon-192.png` (192×192) — ícone azul com castelo
- `/app/icon-512.png` (512×512) — versão grande
- `/app/castle.png` — silhueta branca de castelo, fundo transparente
- `/app/pixie.png` — mascote da IA (estilo Stitch lilás com olhos grandes)

Pode usar qualquer um deles na landing.

## 6. Estrutura de seções sugerida

1. **Hero** — título grande com gradiente dourado-rosa-roxo, subtítulo
   contando o problema, CTA primário "Acessar app →"
2. **Prova social** — número de famílias usando, logos de parques cobertos
3. **A dor** — "Planejar Orlando dá trabalho" (filas, mapa confuso, criança
   muito pequena, ingressos caros, etc.)
4. **Como funciona** — 3 ou 4 features com mockups de tela do app
   (filas tempo real, IA Pixie, família, plano)
5. **A IA Pixie** — destaque grande pra IA, screenshot de conversa real
6. **Pra quem é** — famílias com crianças, brasileiros 1ª viagem, etc.
7. **FAQ** — preço, funciona offline, precisa cadastro, etc.
8. **CTA final** — bem grande, leva pra `/app/`
9. **Footer** — copyright, links pra políticas (placeholder por enquanto)

Pode reorganizar se achar melhor. **Foco total em conversão.**

## 7. Restrições de conteúdo

- **NÃO inventar números.** Se for usar "+5.000 famílias", marca como
  `[PLACEHOLDER — atualizar]` pra eu trocar.
- **NÃO criar depoimentos falsos.** Marca como `[colar depoimento real aqui]`.
- **Email de contato:** `contato@minhaorlando.com.br`
- **Idioma:** Português brasileiro (sem "tu", usar "você")

## 8. O que entregar

Um único arquivo `index.html` completo, pronto pra substituir o atual
em `c:\MinhaOrlando\index.html`. Tudo inline, sem deps externas além de
Google Fonts.

---

## 9. Prompt pronto pra Claude Design (com GitHub conector)

Cole isso direto no Claude Design (claude.ai/design) com o GitHub
conector ativado:

```
Você está conectado ao meu repo GitHub via MCP: MarceloLaure/minhaorlando

Antes de gerar qualquer coisa:
1. Lê BRIEFING_LANDING.md da raiz do repo
2. Olha app/index.html (o app PWA) pra entender a vibe visual atual
3. Olha index.html da raiz (placeholder atual)

NÚMEROS REAIS (use esses, não invente):
• 10 parques: Magic Kingdom, EPCOT, Hollywood Studios, Animal Kingdom,
  Universal Studios, Islands of Adventure, Epic Universe, Volcano Bay,
  SeaWorld, Busch Gardens
• 107 atrações com altura mínima validada por membro da família
• 50+ restaurantes (cardápio, reviews IA, kid-friendly, reservas)
• Filas em tempo real (5 min, queue-times.com) com histórico de picos
• Clima 7 dias + horário (Open-Meteo)
• Câmbio USD/BRL ao vivo
• 24 dias de itinerário exemplo (13/09→06/10/2026)

DIFERENCIAIS:
1. Pixie IA (GPT-4o-mini + web search) — monta roteiro considerando
   filas, clima, altura das crianças, distância
2. Família com altura — filtra automaticamente quem pode em qual brinquedo
3. Despesas com OCR de cupom (foto → extração automática)
4. PWA offline (instala como app nativo)
5. Magic link sem senha

OBJETIVO: vender pra famílias brasileiras indo a Orlando 2026.
CTA: "Acessar o app →" (/app/). Tráfego mobile (Instagram/TikTok).

TÉCNICO:
• Único HTML, CSS inline, sem build, sem React
• Mobile-first 360px-1920px
• SEO: title 60 chars, meta description 155 chars, OG, Twitter Card,
  canonical, hreflang pt-BR
• AEO: JSON-LD SoftwareApplication + FAQPage + Organization
• Performance: critical CSS inline, preload fontes, sem libs externas
• A11y: heading hierarchy, alt em imagens, aria-labels
• Lighthouse alvo 95+ em tudo

ENTREGA: substitui meu index.html da raiz. Um arquivo completo.

Antes de codar mostre:
A) 3 direções de hero (1 frase cada)
B) Estrutura de seções proposta
Aí eu escolho e você executa.
```
