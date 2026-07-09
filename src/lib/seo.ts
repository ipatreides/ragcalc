const SITE_URL = 'https://calc.latam-tools.com.br';
const SITE_NAME = 'RagCalc';

export interface PageSeo {
  title: string;
  description: string;
  path: string;
  jsonLd?: Record<string, unknown>;
}

export function applySeo(seo: PageSeo): void {
  const canonical = `${SITE_URL}${seo.path}`;
  document.title = seo.title;
  setMeta('name', 'description', seo.description);
  setLink('canonical', canonical);

  setMeta('property', 'og:title', seo.title);
  setMeta('property', 'og:description', seo.description);
  setMeta('property', 'og:type', 'website');
  setMeta('property', 'og:url', canonical);
  setMeta('property', 'og:locale', 'pt_BR');
  setMeta('property', 'og:site_name', SITE_NAME);
  setMeta('property', 'og:image', `${SITE_URL}/og.svg`);

  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', seo.title);
  setMeta('name', 'twitter:description', seo.description);
  setMeta('name', 'twitter:image', `${SITE_URL}/og.svg`);

  if (seo.jsonLd) injectJsonLd(seo.jsonLd);
}

export function calculatorJsonLd(args: {
  name: string;
  description: string;
  url: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: args.name,
    description: args.description,
    url: args.url,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web',
    inLanguage: 'pt-BR',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
  };
}

export function siteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'pt-BR',
  };
}

function setMeta(attr: 'name' | 'property', key: string, value: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function setLink(rel: string, href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function injectJsonLd(data: Record<string, unknown>): void {
  let el = document.head.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}
