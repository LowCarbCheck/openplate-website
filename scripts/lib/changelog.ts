/**
 * A CHANGELOG.md, read as release notes.
 *
 * NOT PART OF COLLIE'S PIPELINE. collie publishes documentation and nothing
 * else; these three repositories each keep a changelog written for the person
 * using the program rather than for the person building it, and that is the
 * one page a reader wants when a version number changes under them.
 *
 * The heading is the whole of the format, and both spellings in use are
 * accepted: `## 0.10.1 - 2026-09-04` (openplate) and `## [0.6.0] - 2026-09-04`
 * (Keep a Changelog, which openplate-sync follows). Everything under one
 * heading and above the next is that release's body, parsed by the same reader
 * the documentation pages use, so a changelog gets the site's tables, code
 * fences and links for free.
 *
 * A heading that is neither shape — `## Unreleased`, a stray section — is
 * REPORTED rather than dropped in silence. The caller prints what came back and
 * a release that stopped being published is a line a person sees.
 */
import type { Release } from '../../app/lib/docs';
import { type LinkBase, parseBlocks } from './markdown';

/** `## <version> - <date>`, with the brackets Keep a Changelog puts round the version. */
const RELEASE_HEADING = /^\[?(?<version>\d+\.\d+\.\d+[^\]\s]*)\]?\s+[-–—]\s+(?<date>\d{4}-\d{2}-\d{2})\s*$/;

const HEADING_2 = /^##\s+(?<text>.*)$/;

export interface ChangelogResult {
  releases: Release[];
  /** One line per `## ` heading this reader would not call a release. */
  skipped: string[];
  /** One line per thing the markdown reader refused to guess at. */
  dropped: string[];
}

/** `1.2.3` as three numbers, so the page can order releases rather than trust the file. */
function version(text: string): [number, number, number] {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(text);
  if (match === null) return [0, 0, 0];
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function parseChangelog(markdown: string, base: LinkBase): ChangelogResult {
  const lines = markdown.split('\n');
  const releases: Release[] = [];
  const skipped: string[] = [];
  const dropped: string[] = [];

  /** The heading currently open, and the lines seen under it so far. */
  let open: { version: string; date: string; body: string[] } | null = null;

  const close = () => {
    const current = open;
    if (current === null) return;
    const parsed = parseBlocks(current.body.join('\n'), base);
    dropped.push(...parsed.dropped.map((line) => `${current.version}: ${line}`));
    releases.push({ version: current.version, date: current.date, blocks: parsed.blocks });
    open = null;
  };

  for (const line of lines) {
    const heading = HEADING_2.exec(line);
    if (heading === null) {
      if (open !== null) open.body.push(line);
      continue;
    }
    close();
    const text = heading.groups?.['text']?.trim() ?? '';
    const release = RELEASE_HEADING.exec(text);
    if (release?.groups === undefined) {
      skipped.push(text);
      continue;
    }
    open = { version: release.groups['version'] ?? '', date: release.groups['date'] ?? '', body: [] };
  }
  close();

  // NEWEST FIRST, and sorted here rather than trusted from the file. Every
  // changelog in this workspace is already written newest first, so this
  // changes nothing today — which is the point: the page's order is a property
  // of the page, not a convention a repository could quietly stop keeping.
  const ordered = releases.toSorted((a, b) => {
    const [x, y] = [version(a.version), version(b.version)];
    return y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
  });

  return { releases: ordered, skipped, dropped };
}
