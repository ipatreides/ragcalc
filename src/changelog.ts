// Changelog voltado ao usuário, em pt-BR — mantenha as entradas curtas e sem
// jargão técnico. A PRIMEIRA entrada é a versão atual (usada no rótulo do rodapé
// e no anúncio automático de novidades no Discord após o deploy).
//
// O registro técnico detalhado fica em CHANGELOG.md, na raiz do projeto.

export type ChangelogEntry = {
  version: string;
  date: string; // AAAA-MM-DD
  changes: string[];
  /** Crédito de quem reportou/ajudou — destacado no fim da entrada. */
  credit?: string;
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.3.3",
    date: "2026-08-11",
    changes: [
      "Nova classe na prévia do personagem da calculadora de Conjunto de EXP: Druida, a quarta classe dos Dorams.",
      "Nomes de classe corrigidos para os do jogo: Arquimágico (estava \"Magus\"), Poeta (\"Maestro\"), Assassino (\"Executor\"), Hiperaprendiz (\"Hyper Novice\"), Mestre Celestial (\"Sky Emperor\"), Asceta (\"Soul Ascetic\") e Guerrilheiro (\"Night Watch\").",
      "As quartas classes mais recentes voltam a mostrar o emblema da classe na lista, no lugar do bonequinho que aparecia como substituto.",
    ],
  },
  {
    version: "0.3.2",
    date: "2026-07-25",
    changes: [
      "Os itens dos eventos do Kumamon e das Pipocas saíram da calculadora de Conjunto de EXP: os eventos acabaram e os efeitos não valem mais. Com isso, os espaços de Visual (Meio) e Visual (Capa) deixam de aparecer, já que ficaram sem itens.",
    ],
  },
  {
    version: "0.3.1",
    date: "2026-07-23",
    changes: [
      "Novo item na calculadora de Conjunto de EXP: Snorkel (Aluguel), um chapéu de espaço médio que dá +5% de EXP contra monstros da raça Peixe.",
    ],
  },
  {
    version: "0.3.0",
    date: "2026-07-09",
    changes: [
      "Nova calculadora: Conjunto de EXP! Monte o equipamento que dá mais +% de EXP ao derrotar monstros, veja o total por faixa de nível, os bônus de conjunto e uma prévia do personagem.",
    ],
  },
  {
    version: "0.2.0",
    date: "2026-05-08",
    changes: [
      "Nova calculadora do Martelo de Refino Sombrio: descubra quantos martelos você precisa para alcançar o refino desejado.",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-05-07",
    changes: [
      "Lançamento do RagCalc com as calculadoras de encantamento de insígnia do Chapéu Memorável e da Diadema Temporal.",
    ],
  },
];

export const APP_VERSION = CHANGELOG[0]!.version;
