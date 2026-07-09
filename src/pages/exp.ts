import { renderExpCalculator } from '../components/exp-view';
import { applySeo, calculatorJsonLd } from '../lib/seo';
import '../styles/global.css';
import '../styles/calculator.css';
import '../styles/exp.css';

const url = 'https://calc.latam-tools.com.br/calc/exp';
const description =
  'Monte o melhor conjunto de +% de EXP ao derrotar monstros no Ragnarok Online LATAM: ' +
  'veja o total por faixa de nível, bônus de conjunto e a prévia do personagem.';

applySeo({
  title: 'Calculadora de EXP — Melhor Conjunto de +% EXP | RagCalc',
  description,
  path: '/calc/exp',
  jsonLd: calculatorJsonLd({
    name: 'Calculadora de EXP — Conjunto de +% EXP',
    description,
    url,
  }),
});

const root = document.getElementById('app')!;
renderExpCalculator(root);
