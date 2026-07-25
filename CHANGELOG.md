# Changelog

Todas as mudanças relevantes do projeto estão registradas aqui. O formato é
baseado, de forma flexível, no [Keep a Changelog](https://keepachangelog.com/);
o versionamento é informal enquanto o projeto está pré-1.0. O texto voltado ao
usuário (e a fonte do anúncio automático no Discord após o deploy) fica em
`src/changelog.ts`.

## [0.3.2] — 2026-07-25

### Removido

- **Itens dos eventos do Kumamon e das Pipocas** na Calculadora de Conjunto de
  EXP — os eventos acabaram e os efeitos foram deletados: `[Visual] Pipocas
  Saltitantes` (31518), `[Visual] Peruca de Pipoca` (31736), `[Visual] Capuz de
  Kumamon` (400799), `[Visual] Pipoquinho` (410069) e `[Visual] Mochila de
  Kumamon` (480559), além do bônus de conjunto Capuz + Mochila de Kumamon (+5%).

### Alterado

- Os espaços cujo conjunto de itens ficou vazio deixam de ser exibidos na grade
  e nas tabelas por espaço (`SLOTS` agora filtra os pools sem itens em
  `src/lib/exp-data.ts`). Na prática, somem Visual (Meio) e Visual (Capa).
  Links compartilhados antigos continuam funcionando: ids desconhecidos já eram
  ignorados na leitura do permalink.

## [0.3.1] — 2026-07-23

### Adicionado

- **[Aluguel] Snorkel** (item 19275) na Calculadora de Conjunto de EXP —
  chapéu de espaço médio que dá EXP +5% contra a raça Peixe. Detectado na
  atualização do cliente (GRF) extraindo os itens com bônus de EXP do
  `iteminfo_new.lub`.

## [0.3.0] — 2026-07-09

### Adicionado

- **Calculadora de Conjunto de EXP** (`calc/exp`). Monta um conjunto de
  equipamentos que maximiza o "+% de EXP ao derrotar monstros": grade de espaços
  de equipamento, tabelas de itens por espaço, regras de bônus de conjunto,
  totais por faixa de nível, link compartilhável e uma prévia do personagem via
  ragassets com seletores de classe, gênero, ação e rotação.
- **Anúncio de novidades no Discord após o deploy.** O `tools/post-novidades.mjs`
  publica a entrada mais recente de `src/changelog.ts` como um embed no canal
  #novidades após um deploy bem-sucedido. Integrado ao
  `.github/workflows/deploy.yml`, disparado apenas quando a versão no topo do
  changelog muda. Requer o segredo de repositório `DISCORD_BOT_TOKEN`.

## [0.2.0] — 2026-05-08

### Adicionado

- **Calculadora do Martelo de Refino Sombrio** (`calc/martelo`).

## [0.1.0] — 2026-05-07

### Adicionado

- Lançamento inicial com as calculadoras de encantamento de insígnia do Chapéu
  Memorável e da Diadema Temporal.
