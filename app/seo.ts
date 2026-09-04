/**
 * seo.ts builds the per-page head: title, description, canonical, and the
 * Open Graph tags that carry the same two strings to a link preview.
 *
 * A `meta` export renders outside React, so it cannot use `useTranslation`.
 * It reads the copy through `getFixedT(language)` on the i18next singleton
 * instead, with the language taken from the path being rendered. That is the
 * same source `useLanguage()` reads, and it is stable during the prerender
 * pass, where one process renders every URL of both languages in turn.
 */
import type { MetaDescriptor } from 'react-router';

import i18n from '#app/i18n/i18n';
import { SUPPORTED_LANGUAGES, languageFromPathname, localizePath } from '#app/i18n/language';
import { OG_IMAGE_PATH, SITE_ORIGIN } from '#app/site';

/**
 * `canonicalPath` is the English-rooted path of the page (`/sync`), not the
 * localized one: the language variants are derived from it here.
 */
export function pageMeta(options: {
  canonicalPath: string;
  pathname: string;
  titleKey: string;
  descriptionKey: string;
}): MetaDescriptor[] {
  const { canonicalPath, pathname, titleKey, descriptionKey } = options;
  const language = languageFromPathname(pathname);
  const t = i18n.getFixedT(language, 'common');

  const siteName = t('site.name');
  const pageTitle = t(titleKey);
  const title = pageTitle === siteName ? `${siteName}: ${t('site.tagline')}` : `${pageTitle} | ${siteName}`;
  const description = t(descriptionKey);
  const url = `${SITE_ORIGIN}${localizePath(canonicalPath, language)}`;

  const alternates: MetaDescriptor[] = SUPPORTED_LANGUAGES.map((alternate) => ({
    tagName: 'link',
    rel: 'alternate',
    hreflang: alternate,
    href: `${SITE_ORIGIN}${localizePath(canonicalPath, alternate)}`,
  }));

  return [
    { title },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: url },
    ...alternates,
    { tagName: 'link', rel: 'alternate', hreflang: 'x-default', href: `${SITE_ORIGIN}${canonicalPath}` },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: siteName },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { property: 'og:image', content: `${SITE_ORIGIN}${OG_IMAGE_PATH}` },
    { property: 'og:locale', content: language },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: `${SITE_ORIGIN}${OG_IMAGE_PATH}` },
  ];
}
