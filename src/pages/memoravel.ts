import { renderCalculator } from '../components/calculator-view';
import { MEMORAVEL_CONFIG } from '../lib/enchant-configs';
import { applySeo, calculatorJsonLd } from '../lib/seo';
import '../styles/global.css';
import '../styles/calculator.css';

const url = 'https://calc.latam-tools.com.br/calc/memoravel';

applySeo({
  title: 'Calculadora de Insígnia — Memorável | RagCalc',
  description:
    'Calcule a quantidade de Fragmentos Ominosos e a chance de subir o nível da insígnia do Chapéu Memorável (Ragnarok Online).',
  path: '/calc/memoravel',
  jsonLd: calculatorJsonLd({
    name: 'Calculadora de Insígnia — Memorável',
    description: MEMORAVEL_CONFIG.description,
    url,
  }),
});

const root = document.getElementById('app')!;
renderCalculator(root, MEMORAVEL_CONFIG);
