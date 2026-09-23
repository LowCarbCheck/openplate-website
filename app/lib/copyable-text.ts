/**
 * What the copy button on a code fence puts on the clipboard.
 *
 * ── THE COMMAND, NOT THE TRANSCRIPT ──
 * A fence that shows a terminal session prints `$ ` before each command and the program's output
 * between them. The prompt is painted unselectable (`.tok-prompt`), so a reader who selects by hand
 * already gets the command alone; a button that copied the raw text would paste `$ pnpm dev` and
 * then the output lines into their shell. So when `highlight` finds a prompt, only the prompt lines
 * are copied, each without its prompt. A fence with no prompt is copied exactly as written.
 */
import { highlight } from './highlight';

export function copyableText({ code, lang }: { code: string; lang: string }): string {
  const lines = highlight({ code, lang });
  const isTranscript = lines.some((tokens) => tokens.some((token) => token.kind === 'prompt'));
  if (!isTranscript) return code;
  return lines
    .filter((tokens) => tokens[0]?.kind === 'prompt')
    .map((tokens) =>
      tokens
        .slice(1)
        .map((token) => token.text)
        .join(''),
    )
    .join('\n');
}
