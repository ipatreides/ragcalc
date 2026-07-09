import { renderCalculator } from '../components/calculator-view';
import { DIADEMA_CONFIG } from '../lib/enchant-configs';
import { applySeo, calculatorJsonLd } from '../lib/seo';
import '../styles/global.css';
import '../styles/calculator.css';

const url = 'https://calc.latam-tools.com.br/calc/diadema';

applySeo({
  title: 'Calculadora de Insígnia — Diadema Temporal | RagCalc',
  description:
    'Calcule a quantidade de Poderes Temporais e a chance de subir o nível da insígnia da Diadema Temporal (Ragnarok Online).',
  path: '/calc/diadema',
  jsonLd: calculatorJsonLd({
    name: 'Calculadora de Insígnia — Diadema Temporal',
    description: DIADEMA_CONFIG.description,
    url,
  }),
});

const root = document.getElementById('app')!;
renderCalculator(root, DIADEMA_CONFIG);
