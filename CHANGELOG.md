# Changelog

Todas as mudanças relevantes do projeto estão registradas aqui. O formato é
baseado, de forma flexível, no [Keep a Changelog](https://keepachangelog.com/);
o versionamento é informal enquanto o projeto está pré-1.0. O texto voltado ao
usuário (e a fonte do anúncio automático no Discord após o deploy) fica em
`src/changelog.ts`.

## [0.3.3] — 2026-08-11

### Adicionado

- **`tools/sync-classes.mjs`** — gera `src/lib/classes.json` a partir de
  `https://assets.latam-tools.com.br/raw/classes.json` (projeto irmão ragassets,
  que extrai a tabela do GRF do cliente LATAM). Aceita `--input` para ler um
  arquivo local, além de `--url` e `--out`. Substitui a cópia manual vinda do
  `public/db/classes.json` do latamvisuais, que era como o arquivo ficava
  desatualizado sem ninguém perceber. Documentado em
  `.claude/skills/sync-with-ragassets/SKILL.md`.
- **Druida** (id 4308), a quarta classe dos Dorams, que faltava na lista.
- Testes: `tools/sync-classes.test.mjs` (transformação, sobre uma fatia real da
  tabela de origem em `tools/fixtures/classes-raw.json`, sem rede) e
  `src/lib/classes.test.ts` (saída de `CLASSES` fixada por classe).

### Alterado

- `src/lib/classes.json` passa a conter só o que o app consome
  (`{id, jt, name, group, genders}`): 22.8 kB → 8.1 kB. As paletas de cor de
  roupa eram herança da cópia do latamvisuais e nunca foram lidas aqui — o que
  o app usa delas (existe sprite masculino/feminino?) virou `genders`, calculado
  na geração em vez de a cada carga da página.
- `group` é classificação nossa (não existe na origem) e agora mora em `GROUPS`,
  em `tools/sync-classes.mjs`, que também fixa a ordem da lista. Uma classe nova
  na origem sem grupo faz o script falhar em vez de escrever a tabela.
- Nomes corrigidos para os rótulos do próprio cliente LATAM: Arquimágico
  (era `Magus`), Poeta (`Maestro`), Assassino (`Executor`), Hiperaprendiz
  (`Hyper Novice`), Mestre Celestial (`Sky Emperor`), Asceta (`Soul Ascetic`) e
  Guerrilheiro (`Night Watch`).

### Removido

- `JOB_ICON_FALLBACK` em `src/lib/classes.ts`. Ele existia porque a cópia manual
  não trazia o `renderId` e o ragassets não servia `/icons/job/<id>.png` para as
  quartas classes expandidas; hoje serve para 4302–4308, e o id do arquivo já é
  o `renderId`. As classes que caíam no fallback voltam ao emblema de classe em
  vez do render de sprite.

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
