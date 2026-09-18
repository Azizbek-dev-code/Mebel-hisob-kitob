import { useEffect } from 'react';

import { SITE_URL, type PageSeo } from '../seo';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function upsertJsonLd(id: string, data: Record<string, unknown> | Record<string, unknown>[]) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * Client-side document head for SPA public pages.
 * Complements static index.html defaults for crawlers that execute JS.
 */
export function usePageSeo(seo: PageSeo) {
  useEffect(() => {
    const url = `${SITE_URL}${seo.path === '/' ? '/' : seo.path}`;
    document.title = seo.title;
    upsertMeta('name', 'description', seo.description);
    upsertMeta('name', 'robots', seo.robots ?? 'index, follow');
    upsertLink('canonical', url);
    upsertMeta('property', 'og:title', seo.title);
    upsertMeta('property', 'og:description', seo.description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', `${SITE_URL}/og-image.png`);
    upsertMeta('name', 'twitter:title', seo.title);
    upsertMeta('name', 'twitter:description', seo.description);
    upsertMeta('name', 'twitter:image', `${SITE_URL}/og-image.png`);
    if (seo.jsonLd) {
      upsertJsonLd('balancy-page-jsonld', seo.jsonLd);
    } else {
      document.getElementById('balancy-page-jsonld')?.remove();
    }
  }, [seo]);
}

/** Private app shells: keep out of the public index. */
export function useNoIndex() {
  useEffect(() => {
    upsertMeta('name', 'robots', 'noindex, nofollow');
  }, []);
}
