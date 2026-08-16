// Rodapé único do site. Antes esta marcação estava copiada em quatro telas
// (home, calculadora de insígnia, Conjunto de EXP e Martelo de Refino Sombrio),
// e mexer em uma sem mexer nas outras deixava telas para trás.

const ISSUES_URL = 'https://issues.latam-tools.com.br';
const ISSUES_PROJECT = 'calc';

const REPORT_URL = `${ISSUES_URL}/novo?projeto=${ISSUES_PROJECT}`;
const TRACK_URL = `${ISSUES_URL}/?projeto=${ISSUES_PROJECT}`;

/** Rodapé completo, com o rótulo de versão vindo de `APP_VERSION`. */
export function footerHtml(version: string): string {
  return `
    <footer class="site-footer">
      <p>Veja mais ferramentas em <a href="https://latam-tools.com.br" target="_blank" rel="noopener noreferrer">latam-tools.com.br</a>.</p>
      <p>Entre no nosso <a href="https://discord.gg/JCXTqqWq9Q" target="_blank" rel="noopener noreferrer">Discord</a>. Projeto open source no <a href="https://github.com/adsonpleal/ragcalc" target="_blank" rel="noopener noreferrer">GitHub</a>.</p>
      <p class="footer-issues">Achou um erro ou tem uma sugestão? <a href="${REPORT_URL}" target="_blank" rel="noopener noreferrer">Reportar um problema</a> · <a href="${TRACK_URL}" target="_blank" rel="noopener noreferrer">Acompanhar os reportes</a></p>
      <p class="footer-version"><a href="https://github.com/adsonpleal/ragcalc/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer">RagCalc v${escapeHtml(version)}</a></p>
    </footer>
  `;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return c;
    }
  });
}
