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

/**
 * Exported so a caller can ADD to it rather than replace it.
 *
 * `className` on the two components below overrides this string wholesale, which is right for a
 * link that is styled as something else entirely and wrong for one that wants the ordinary link
 * plus one property. A second copy of these four classes is a second thing to keep in step.
 */
export const LINK_CLASS = 'text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary';

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
