/**
 * The three link primitives every page uses.
 *
 * `SiteLink` takes a CANONICAL, English-rooted path and localizes it into the
 * language of the page being rendered, which is what keeps a German page from
 * linking a reader back into English. `ExternalLink` is the plain anchor for a
 * URL that leaves the site, and `RepoLink` is that anchor wearing the GitHub
 * mark, for the one destination this site links to often enough to label.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { GitHubMark } from './icons';
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

/**
 * A link to a repository, wearing the mark of the place it goes.
 *
 * ── IT IS A COMPONENT BECAUSE OF `<Trans>`, AND IT LIVES HERE BECAUSE FOUR PAGES USE IT ──
 * The three repository links on the front page sit inside ONE translated sentence, so `<Trans>`
 * receives each of them as a childless element and CLONES it with the words between the sentence's
 * tags. There is nowhere at the call site to put an icon beside those words. A component that
 * renders the mark and then its own children puts it there, and the sentence in `common.json` stays
 * a sentence. The component pages then reuse it for the link rows at their feet, which is what
 * makes "every repository link carries the mark" a property of the site rather than of one page.
 *
 * The mark is sized in `em` and sits on `currentColor`, so it grows with the type around it and
 * needs no colour of its own. `align-[-0.12em]` is the optical correction: an SVG box sits on the
 * baseline, and a mark that sits ON the baseline reads as floating above the text beside it.
 *
 * ── `inline-block` ON THE LINK IS WHAT KEEPS THE MARK WITH ITS ADDRESS ──
 * A line may break between an image and the text after it, and the rendered page did exactly that:
 * a mark alone at the end of a line with `github.com/LowCarbCheck/openplate-inference` on the next
 * one. A U+2060 word joiner does not stop it, because the break is beside a replaced element and
 * not between two characters. As an inline-block the link moves to the next line whole, and when it
 * is wider than the column it wraps INSIDE itself, after one of its own slashes, with the mark
 * still on the first line of it. `white-space: nowrap` would have made the longest of the three
 * overflow a phone. The underline still belongs to the link, which draws it on its own content.
 * `text-decoration` is not inherited into an inline-block, so the mark is correctly not underlined.
 */
export function RepoLink({ href, children }: { href: string; children?: ReactNode }) {
  return (
    <ExternalLink href={href} className={`${LINK_CLASS} inline-block`}>
      <GitHubMark className="mr-1 inline-block h-[0.95em] w-[0.95em] align-[-0.12em]" />
      {children}
    </ExternalLink>
  );
}
