/**
 * The two link primitives every page uses.
 *
 * `SiteLink` takes a CANONICAL, English-rooted path and localizes it into the
 * language of the page being rendered, which is what keeps a German page from
 * linking a reader back into English. `ExternalLink` is the plain anchor for a
 * URL that leaves the site.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { localizePath } from '#app/i18n/language';
import { useLanguage } from '#app/i18n/use-language';

const LINK_CLASS = 'text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary';

/**
 * `children` is optional because `<Trans>` supplies it: a link inside a
 * translated sentence is passed as an empty element and cloned with the text
 * between the sentence's tags.
 */
export function SiteLink({ to, className, children }: { to: string; className?: string; children?: ReactNode }) {
  const language = useLanguage();

  return (
    <Link to={localizePath(to, language)} className={className ?? LINK_CLASS}>
      {children}
    </Link>
  );
}

export function ExternalLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <a href={href} className={className ?? LINK_CLASS} rel="noreferrer">
      {children}
    </a>
  );
}
