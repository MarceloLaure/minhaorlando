# 🎢 Minha Orlando — Trip Planner 2026

> O app da galera pra não perder nada na viagem dos sonhos.

**Acessa em:** https://minhaorlando.com.br
**Login:** seu email → magic link cai na sua caixa → pronto, sem senha.
**Instala como app:** assim que abrir, aparece o botão "📲 Instalar app". Vira nativo no celular (com ícone na tela inicial, abre tela cheia, sem barra do navegador).

---

## ✨ O que tem hoje

### 🧚 Pixie — sua IA particular da viagem
Assistente que **pesquisa na web ao vivo** quando você pergunta. Sabe responder:
- "Quais shows de fogo tem essa semana no MK?"
- "Onde almoçar no Galaxy's Edge sem fila?"
- "É melhor Hagrid ou Velocicoaster?"
- "Easter eggs do Animal Kingdom"
- "Concertos em Orlando entre 13/09 e 06/10/2026"

Roda no GPT-4.1 com `web_search` ligado e localização travada em Orlando.

### ⏱ Filas em tempo real
Filas atualizadas a cada 5 min nos **9 parques**:
- Disney World — Magic Kingdom, EPCOT, Hollywood Studios, Animal Kingdom
- Universal Orlando — Epic Universe, Universal Studios, Islands of Adventure, Volcano Bay
- SeaWorld Orlando
- Busch Gardens Tampa Bay

### 🎭 Shows e desfiles do dia
Cards com **todos os horários** do dia (próximo destacado, passados riscados). Festival of Fantasy, Happily Ever After, Luminous, Fantasmic, Festival of the Lion King, Stardust Wishes, Orca Encounter… **+50 shows** cadastrados.

Tap no show → Pixie te conta tudo: vale a pena? Bom pra criança? Melhor lugar pra assistir? + busca fotos no YouTube.

### 💡 Dicas dos parques (curadas + IA)
Cada parque tem **dicas evergreen** instantâneas (rope drop em TRON, Single Rider do Velocicoaster, vista alternativa do Happily Ever After…) **+ 8 botões de categoria** que disparam Pixie:
- 🥚 Easter eggs e segredos
- 🍴 Snacks famosos (turkey leg, dole whip, butterbeer…)
- 🎆 Melhor lugar pra ver shows
- 🍶 Refill bottle / lockers
- 🎁 Pin trading e souvenirs
- 🚪 Atrações pouco conhecidas
- ⏱ Estratégia Genie+/Express
- 👶 Família com crianças

### 👨‍👩‍👧 Família com restrições por altura
Cadastra cada membro com altura/idade. O app calcula automaticamente:
- ✓ Quantas atrações cada um **pode** ir (clica e vê a lista por parque, com nome de cada uma)
- ✕ Quais **não pode** (com altura mínima exigida)
- Múltiplas famílias suportadas — qualquer um navega, mas só membros editam

### 💰 Despesas com IA
Tira foto do cupom → **GPT-4o lê e preenche automaticamente** o valor, descrição, data, categoria. Você só revisa e salva. Suporta:
- Pessoal vs Grupo (rateio entre membros)
- Conversão USD → BRL em tempo real
- Total acumulado no dia / na viagem

### 📅 Itinerário do dia-a-dia
Cada dia da viagem com:
- Que parque vai (com cor + emoji)
- Restaurante reservado (com link pro Maps)
- Compras (Walmart, Outlet…)
- Hospedagem
- Endereço com Google Maps clicável

### 🎟 Eventos em Orlando
A Pixie pesquisa eventos **dentro da janela da sua viagem**: jogos do Magic, MLS Orlando City, NWSL Pride, Bucs (NFL), shows musicais, festivais sazonais (HHN, Mickey Halloween Party, EPCOT Food & Wine).

### 🗺 Mapa, restaurantes e atrações
- Catálogo de **+90 atrações** (Hagrid's, Velocicoaster, Avatar Flight of Passage, Slinky Dog, TRON…)
- Restaurantes dentro/fora dos parques (Be Our Guest, Le Cellier, Boathouse, Yak & Yeti)
- Cada atração com fila ao vivo + foto + histórico de picos (snapshots horários)

### 🌤 Clima + câmbio
- Previsão de Orlando pra próximos 7 dias (Open-Meteo)
- USD → BRL em tempo real (ExchangeRate-API)

### 📡 Funciona offline
PWA completo:
- Service Worker com cache de tudo
- Abre sem internet (mostra dados em cache)
- Atualiza sozinho quando volta online

---

## 🔒 Privacidade

- Login só por **magic link** no email — sem senha, sem upload de dados
- Allowlist de emails: só quem você adiciona consegue entrar
- Multi-família: você só vê os dados da SUA família (admin pode mais)
- Fotos ficam no Supabase Storage (bucket público com paths UUID — só vê quem tem o link exato)
- Zero anúncio, zero tracking de terceiros

---

## 🛠 Como foi feito (pros curiosos)

- **Front:** HTML único + React via CDN + Babel transformando JSX no browser. Sem build step.
- **Backend:** [Supabase](https://supabase.com) — Postgres + Auth + Storage + Edge Functions
- **IA:** OpenAI GPT-4.1 (chat) e GPT-4o (OCR de cupom)
- **APIs:** queue-times.com (filas), Open-Meteo (clima), ExchangeRate-API (câmbio)
- **Hosting:** Hostinger com auto-deploy via webhook do GitHub
- **PWA:** service worker próprio com kill switch (`?reset`) pra limpar cache

Repo: https://github.com/MarceloLaure/minhaorlando

---

## ⚠️ Ainda é beta

Eu (Marcelo) tô construindo isso pra nossa viagem em **set/26**. Está em desenvolvimento ativo — pode ter bug. Se achar:
- Manda screenshot
- Descreve o que tava fazendo
- Aceita "Instalar app" pra testar PWA de verdade

**Toda sugestão vale.** Se quiser que adicione restaurantes/atrações/eventos específicos, me fala.

---

🎢 **Vamos fazer 2026 inesquecível.**
