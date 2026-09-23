/**
 * The page frame at one `PageWidth`, and for `docs` the documentation shell inside it, with its
 * file list, its phone bar and its contents rail. What `page-frame-width.test.ts` renders.
 *
 * A `.tsx` of its own for the reason `page-frame.tsx` gives: the unit glob takes `*.test.ts`.
 */
import { DocsShell } from '../../../app/components/docs/docs-shell';
import { type PageWidth, SiteLayout } from '../../../app/components/site-layout';
import { I18nProvider } from '../../../app/i18n/I18nProvider';
import { DOCS_INDEX } from '../../../src/generated/docs-index';

const SECTIONS = [
  { id: 'one', text: 'One', level: 2 },
  { id: 'two', text: 'Two', level: 2 },
];

export function WidthFrame({ width }: { width: PageWidth }) {
  return (
    <I18nProvider language="en">
      <SiteLayout width={width}>
        {width === 'docs' ?
          <DocsShell
            index={DOCS_INDEX}
            place={{ kind: 'doc', component: 'app', slug: 'architecture' }}
            sections={SECTIONS}
          >
            <p>body</p>
          </DocsShell>
        : <p>body</p>}
      </SiteLayout>
    </I18nProvider>
  );
}
