/**
 * A code fence's text, coloured by `highlight`.
 *
 * PORTED FROM collie-website's `src/components/code-tokens.tsx`.
 *
 * Tokens are spans inside the caller's `<code>` with the newlines written back
 * between lines, so a copied command pastes with the source's own line breaks.
 * A plain run gets no element at all.
 */
import { Fragment } from 'react';

import { highlight } from '#app/lib/highlight';

export function CodeTokens({ text, lang }: { text: string; lang: string }) {
  const lines = highlight({ code: text, lang });
  return (
    <>
      {lines.map((tokens, i) => (
        // oxlint-disable-next-line react/no-array-index-key -- lines of an immutable string, never reordered
        <Fragment key={`line-${i}`}>
          {i === 0 ? null : '\n'}
          {tokens.map((token, j) =>
            token.kind === 'plain' ?
              token.text
              // oxlint-disable-next-line react/no-array-index-key -- tokens of an immutable line, never reordered
            : <span key={`tok-${j}`} className={`tok-${token.kind}`}>
                {token.text}
              </span>,
          )}
        </Fragment>
      ))}
    </>
  );
}
