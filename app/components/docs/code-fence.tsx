/**
 * A fenced code block with a copy button.
 *
 * ── THE BUTTON HAS ITS OWN ROW ──
 * A bar across the top of the fence holds the language on the left and the button on the right, and
 * the code starts under it. A button floated over the corner of the code would cover the end of the
 * first line, and code scrolled sideways would slide under it. The bar is there from the first
 * paint at a fixed 44 pixel height, which is also the button's touch target, so nothing moves when
 * the script arrives or when a copy succeeds: the icon swaps for a check of the same size.
 *
 * WITHOUT JAVASCRIPT the block renders whole and the code can be selected by hand; the button is
 * the only part that waits for the script. It is `data-pagefind-ignore` with the rest of the bar, so
 * the search index holds the code and not the word "Copy".
 *
 * `doc-fence` borrows the dark palette block in `app.css` and pins `color-scheme: dark`, so every
 * token utility on and inside it resolves to its dark value. `text-foreground` sits on this outer
 * box, inside that scope: the plain runs of `CodeTokens` carry no colour, and would otherwise
 * inherit the page's ink already resolved outside it (collie 84f3f55).
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { copyableText } from '#app/lib/copyable-text';
import { CodeTokens } from './code-tokens';
import { CheckIcon, CopyIcon } from './doc-icons';

/** How long the check stays before the button offers to copy again. */
const COPIED_FOR_MS = 2000;

type CopyState = 'idle' | 'copied' | 'failed';

const LABEL_KEY = {
  idle: 'copy.idle',
  copied: 'copy.done',
  failed: 'copy.failed',
} as const satisfies Record<CopyState, string>;

function CopyButton({ text }: { text: string }) {
  const { t } = useTranslation('docs');
  const [state, setState] = useState<CopyState>('idle');

  useEffect(() => {
    if (state === 'idle') return undefined;
    const timer = window.setTimeout(() => {
      setState('idle');
    }, COPIED_FOR_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [state]);

  async function copy(): Promise<void> {
    // No clipboard outside a secure context, and a browser may refuse the write. Either way the
    // reader is told, and the code is still there to select.
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
  }

  const label = t(LABEL_KEY[state]);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          void copy();
        }}
        aria-label={label}
        title={label}
        className="flex size-11 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
      >
        {state === 'copied' ?
          <CheckIcon className="size-4" />
        : <CopyIcon className="size-4" />}
      </button>
      <output className="sr-only">{state === 'idle' ? '' : label}</output>
    </>
  );
}

export function CodeFence({ text, lang, className }: { text: string; lang: string; className: string }) {
  return (
    <div className={`doc-fence border border-border bg-muted text-foreground ${className}`}>
      <div data-pagefind-ignore className="flex h-11 items-center justify-between border-b border-border pl-4">
        <span className="font-mono text-xs text-muted-foreground">{lang}</span>
        <CopyButton text={copyableText({ code: text, lang })} />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[0.8125rem] leading-relaxed">
        {/* The language is on the <code>, not just used by it.
            `class="language-bash"` is what a reader's view-source and
            every scraper read to know what this is. */}
        <code className={lang === '' ? undefined : `language-${lang}`}>
          <CodeTokens text={text} lang={lang} />
        </code>
      </pre>
    </div>
  );
}
