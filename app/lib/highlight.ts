/**
 * Syntax highlighting for the documentation's code fences.
 *
 * PORTED FROM collie-website's `src/lib/highlight.ts`, with JSON added: most of
 * openplate's fences are `bash` and `json`.
 *
 * A reader trusts colour, so this marks only what one line decides on its own
 * and leaves everything else plain. The failure mode is less colour than
 * possible, never colour in the wrong place. No dependency: a general
 * highlighter ships hundreds of grammars to colour three languages.
 */

export type TokenKind = 'plain' | 'comment' | 'string' | 'variable' | 'key' | 'flag' | 'prompt' | 'section';

export interface Token {
  kind: TokenKind;
  text: string;
}

const SHELLS = new Set(['bash', 'sh', 'shell', 'console', 'zsh']);
const JSONS = new Set(['json', 'jsonc', 'json5']);

/**
 * `$ ` at the head of a line, and only in a `console` transcript. `#` is never
 * a prompt: it also opens a comment, and a commented out setting read as a root
 * prompt looks exactly like a live one.
 */
const PROMPT = /^(\s*\$\s)/;

/** `$NAME`, `${NAME}`, `$1`. Not `$` alone and not `$(`. */
const VARIABLE = /^\$(?:\{[^}]*\}|[A-Za-z_]\w*|\d)/;

/** `NAME=` at the start of a word. */
const ASSIGNMENT = /^([A-Za-z_]\w*)(=)/;

/** `-x`, `--long-flag`. Not a bare `-` and not a negative number. */
const FLAG = /^--?[A-Za-z][\w-]*/;

/** A TOML table header alone on its line. */
const SECTION = /^\s*\[\[?[^\]]+\]\]?\s*$/;

/** Appends a token, merging it into the last one of the same kind so a plain run is one span. */
function push(out: Token[], token: Token): void {
  if (token.text === '') return;
  const last = out.at(-1);
  if (last !== undefined && last.kind === token.kind) last.text += token.text;
  else out.push({ ...token });
}

/** A quoted run from the head of `rest`, to its closing quote or the line end if it never closes. */
function quoted(rest: string, quote: string): string {
  const close = rest.indexOf(quote, 1);
  return close === -1 ? rest : rest.slice(0, close + 1);
}

/** A JSON string from the head of `rest`, honouring backslash escapes. */
function jsonString(rest: string): string {
  for (let at = 1; at < rest.length; at += 1) {
    if (rest[at] === '\\') at += 1;
    else if (rest[at] === '"') return rest.slice(0, at + 1);
  }
  return rest;
}

/** One word-start match in a shell line: an assignment key or a flag, or null. */
function wordStart(rest: string): Token[] | null {
  const assignment = ASSIGNMENT.exec(rest);
  if (assignment !== null) {
    return [
      { kind: 'key', text: assignment[1] ?? '' },
      { kind: 'plain', text: '=' },
    ];
  }
  const flag = FLAG.exec(rest);
  return flag === null ? null : [{ kind: 'flag', text: flag[0] }];
}

/**
 * One line of shell, left to right, single pass. At each position it either
 * consumes one pattern whole or one character as plain.
 */
function shellLine(line: string, transcript: boolean): Token[] {
  const out: Token[] = [];
  let rest = line;
  const prompt = transcript ? PROMPT.exec(rest) : null;
  if (prompt !== null) {
    push(out, { kind: 'prompt', text: prompt[1] ?? '' });
    rest = rest.slice(prompt[0].length);
  }

  let isWordStart = true;
  while (rest !== '') {
    const char = rest[0] ?? '';
    // Only at a word boundary: `nixcfg#flake` and `id=#3` are not comments.
    if (char === '#' && isWordStart) {
      push(out, { kind: 'comment', text: rest });
      return out;
    }
    const matched = matchShell({ rest, isWordStart });
    if (matched !== null) {
      for (const token of matched) push(out, token);
      rest = rest.slice(matched.reduce((length, token) => length + token.text.length, 0));
      isWordStart = false;
      continue;
    }
    push(out, { kind: 'plain', text: char });
    rest = rest.slice(1);
    isWordStart = /[\s|;&(]/.test(char);
  }
  return out;
}

/** The token run a shell line starts with at this position, or null when the character is plain. */
function matchShell({ rest, isWordStart }: { rest: string; isWordStart: boolean }): Token[] | null {
  const char = rest[0];
  if (char === '"' || char === "'") return [{ kind: 'string', text: quoted(rest, char) }];
  const variable = char === '$' ? VARIABLE.exec(rest) : null;
  if (variable !== null) return [{ kind: 'variable', text: variable[0] }];
  return isWordStart ? wordStart(rest) : null;
}

/** TOML: `# comment`, `[section]`, `key = value` and quoted strings. */
function tomlLine(line: string): Token[] {
  const out: Token[] = [];
  if (line.trimStart().startsWith('#')) return [{ kind: 'comment', text: line }];
  if (SECTION.test(line)) return [{ kind: 'section', text: line }];

  const eq = line.indexOf('=');
  let rest = line;
  if (eq > 0 && /^[\w.\-"' ]+$/.test(line.slice(0, eq))) {
    push(out, { kind: 'key', text: line.slice(0, eq) });
    push(out, { kind: 'plain', text: '=' });
    rest = line.slice(eq + 1);
  }
  while (rest !== '') {
    const char = rest[0] ?? '';
    if (char === '#' && (out.at(-1)?.text.endsWith(' ') ?? true)) {
      push(out, { kind: 'comment', text: rest });
      return out;
    }
    const isQuote = char === '"' || char === "'";
    const text = isQuote ? quoted(rest, char) : char;
    push(out, { kind: isQuote ? 'string' : 'plain', text });
    rest = rest.slice(text.length);
  }
  return out;
}

/**
 * JSON: a string followed by `:` is a key, any other string is a string, and
 * `//` outside a string opens a comment (jsonc). Numbers and literals stay plain.
 */
function jsonLine(line: string): Token[] {
  const out: Token[] = [];
  let rest = line;
  while (rest !== '') {
    if (rest.startsWith('//')) {
      push(out, { kind: 'comment', text: rest });
      return out;
    }
    if (rest[0] !== '"') {
      push(out, { kind: 'plain', text: rest[0] ?? '' });
      rest = rest.slice(1);
      continue;
    }
    const text = jsonString(rest);
    rest = rest.slice(text.length);
    push(out, { kind: /^\s*:/.test(rest) ? 'key' : 'string', text });
  }
  return out;
}

/**
 * Tokenise a code block into one token list per line, so the renderer keeps the
 * block's own line breaks. An unknown language comes back plain.
 */
export function highlight({ code, lang }: { code: string; lang: string }): Token[][] {
  const language = lang.toLowerCase();
  const transcript = language === 'console';

  return code.split('\n').map((line): Token[] => {
    if (line === '') return [];
    if (SHELLS.has(language)) {
      // In a transcript only a prompt line is shell. The rest is a program's
      // output, and an English apostrophe would open a string there.
      if (transcript && !PROMPT.test(line)) return [{ kind: 'plain', text: line }];
      return shellLine(line, transcript);
    }
    if (language === 'toml') return tomlLine(line);
    if (JSONS.has(language)) return jsonLine(line);
    return [{ kind: 'plain', text: line }];
  });
}
