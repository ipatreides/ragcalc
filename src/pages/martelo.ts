import { renderMarteloCalculator } from '../components/martelo-view';
import { MARTELO_CONFIG } from '../lib/martelo-math';
import { applySeo, calculatorJsonLd } from '../lib/seo';
import '../styles/global.css';
import '../styles/calculator.css';

const url = 'https://calc.latam-tools.com.br/calc/martelo';

applySeo({
  title: 'Calculadora de Refino — Martelo de Refino Sombrio | RagCalc',
  description:
    'Calcule a quantidade de Martelos de Refino Sombrio para alcançar um refino alvo (≥+N) no Ragnarok Online.',
  path: '/calc/martelo',
  jsonLd: calculatorJsonLd({
    name: 'Calculadora de Refino — Martelo de Refino Sombrio',
    description: MARTELO_CONFIG.description,
    url,
  }),
});

const root = document.getElementById('app')!;
renderMarteloCalculator(root, MARTELO_CONFIG);
