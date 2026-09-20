# 0008: Documentation is quoted per file

- **Status:** Accepted
- **Date:** 2026-09-20
- **Deciders:** Altan
- **Tracker:** M240/04

## Context

This site does not host openplate's documentation, it quotes it.
`scripts/sync-docs.ts` clones openplate, openplate-core and openplate-inference
and copies each repository's `README.md`, `CHANGELOG.md` and `docs/` into
`src/generated/`, which is committed.

Which ref it quotes has always been the hard part. The highest `vX.Y.Z` tag is
the safe answer, because the default branch can document code that is not
released, and a page describing a program nobody can run is internally
consistent, reads perfectly, and is a lie. The cost of that answer was that
correcting a sentence in `docs/` needed a release whose only content was the
sentence.

The way out, until today, was one question asked of the whole range: if every
path that differed between the tag and the default branch was `docs/`,
`README.md` or `CHANGELOG.md`, then the branch's code WAS the released code and
the whole branch was quoted instead. The argument is sound. The granularity is
not, and two incidents in two days showed it:

- **2026-09-19.** A documentation fix landed on a member repo's `main` and went
  live on the site, correctly. Later the same day an unrelated code commit
  joined the same tag-to-branch range. The range-wide verdict flipped, every
  page in it went back to the tag, and the already-published fix was reverted by
  somebody who had never touched it.
- **2026-09-20.** A documentation fix shipped together with a guard test file,
  so the range carried a non-documentation path. The fix could only reach the
  site through a whole patch release, openplate v0.35.1, cut for that reason.

Both have one mechanism: the rule answers for a RANGE, and the thing being
published is a FILE. A page whose own source has not moved is reverted by a
change to a file it has nothing to do with.

The owner's ruling, which this ADR implements rather than reopens: **we should
not count docs as releases.** A documentation fix must reach the site without a
version tag.

## Decision

**A documentation file is quoted per file, and the published tree is a hybrid.**

The base tree stays the repository's highest semver tag `T`. Over it, the sync
lays the individual documentation files that are a documentation-only change
since `T`. Everything else in the tree, every source file, every compose file,
every `.env.example`, is `T`'s, always.

### The criterion, exactly

For a documentation file `F` (anything under `docs/`, plus `README.md`;
`CHANGELOG.md` follows the same rule) and the default branch tip `M`, `F` is
read from the branch when BOTH hold:

1. `F` differs between `T` and `M`, and
2. every commit in `T..M` that touches `F` touches only documentation paths
   (`docs/**`, `README.md`, `CHANGELOG.md`).

Otherwise `F` is `T`'s copy. The reasoning is provenance, not tree shape: a file
whose last change rode in beside a code change belongs to that code's release and
waits for its tag; a file only ever touched by documentation-only commits is a
documentation fix, and the code around it is irrelevant to it.

Two corollaries fall out of the same criterion and are tested as cases in their
own right. A file that does not exist at `T` and was added by documentation-only
commits is quoted from `M`; one added by a commit that also changed code is left
out of the tree until the tag. A file DELETED by a documentation-only commit is
removed from the hybrid tree rather than resurrected from the tag.

### How the tree is built

`documentationAhead` in `scripts/lib/clone.ts` answers the criterion from a
blobless clone: one `git diff --no-renames -z --name-status T origin/M` for what
differs, one `git log --no-merges --no-renames --name-only T..origin/M` for who
touched what. `worktree` in `scripts/sync-docs.ts` then clones `T` at depth 1 as
before, fetches the branch at depth 1, and runs `git checkout <commit> -- <paths>`
for the cleared files. **The tree is built from git objects and no ref is ever
moved**, so the checkout is still `T`'s tree with named files replaced, which is
exactly what the quote claims it is.

The walk is over non-merge commits, because a merge commit's contents are its
parents' commits and those are all inside the range. An evil merge, a merge that
edits a file while resolving it, belongs to no non-merge commit and is therefore
invisible to the walk. It cannot ADD a file to the overlay, because a file the
walk never sees is never taken, so that gap fails to the pessimistic side.

This replaces the old rule's explicit "net difference, not a walk of the
commits" argument, and that is a deliberate reversal. The net-tree reading was
right for a question about the whole tree; a question about one file's
provenance can only be answered from the commits that touched it. One
consequence: a branch that changed code and reverted it holds back any
documentation file the reverting commit also touched, where the old rule would
have published it.

### The consistency guard

`README.md` is the manifest. It names every page this site publishes, and the
sync already refuses a table row with no file and a `docs/` file with no row.
`README.md` is also a documentation file with its own verdict, so a hybrid tree
can hold a new `docs/` page from `M` beside a `README.md` from `T` that has never
heard of it.

**The sync fails fast, names the file, names both refs, and does not fall back.**
`overlayBlame` in `scripts/sync-docs.ts` produces the sentence, and it reads:

```
app: docs/extra.md is quoted from main while README.md is quoted from v1.0.0, so
the Documentation table and the tree come from different refs and disagree. Land
a documentation-only commit that changes both, or wait for the next tag.
```

A silent fallback to quoting the whole repository at the tag was rejected on the
spot: that is the exact shape of the 2026-09-19 incident, a page going live and
then vanishing with nobody told why.

The other two manifest checks keep their own messages. "README has no
Documentation section" is already specific. The stack pages, which quote sections
out of these documents by exact heading, now fail the day a documentation-only
commit rewords a heading upstream rather than the day that reword is released.
That is louder and earlier, and it is the behaviour we want: the alternative is a
front page with a hole in it.

### What `SOURCE.json` records

`src/generated/SOURCE.json` and its copy at `public/SOURCE.json` gain three
fields per source. `repo`, `ref`, `commit` and `syncedAt` keep the meanings every
existing reader depends on; the new fields are added beside them, because a
hybrid tree is two refs and `ref` can only honestly be the one the code came
from.

| Field               | Meaning                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `branch`            | The default branch documentation may be quoted from per file.                              |
| `branchCommit`      | The commit on that branch the overlaid files were READ at, or `null` when none were taken. |
| `documentationFrom` | The repo-relative paths quoted from `branchCommit` instead of from `ref`, sorted.          |

`branchCommit` is the newest commit that touched one of those files, and
deliberately NOT the branch tip. Every file in the list was last touched at or
before it, so its blob there is its blob at the tip and the three fields rebuild
the tree byte for byte. The tip would rebuild the same tree and would also move
on every unrelated code push upstream, which would write a new `SOURCE.json` for
a quote that had not changed and fail this repository's own push gate on a clean
tree.

Two consumers move with the fields:

- **`.githooks/pre-push`** pins the recorded `ref` through a new
  `OPENPLATE_*_TAG` variable instead of `OPENPLATE_*_REF`. The new variable pins
  only the BASE and still re-resolves the overlay, which is what keeps the tier a
  staleness check: a new tag upstream does not fail the push, and a guide pushed
  upstream since does, because the hybrid tree genuinely changed.
  `OPENPLATE_*_REF` keeps its old meaning, read this ref whole, which is what a
  person checking a claim wants.
- **`.github/workflows/sync-docs.yml`** polls the deployed site for the commits
  it just pushed. It now compares `commit` and `branchCommit` together; on
  `commit` alone a documentation-only sync would be satisfied by the previous
  deploy, because a documentation fix does not move the tag. (The same line
  carried a typo, `.sync`, for a key this file has always called `core`, so core
  was compared as `null` on both sides. Fixed in the same change.)

## Alternatives Considered

- **(b) Keep the range-wide rule and show the lag on the page.** A visible "as of
  vX.Y.Z" or "pending release" marker on each docs page, routed through
  wordsmith. Rejected: it makes the delay legible but still leaves the site
  publishing a sentence we know is wrong, and the marker cannot explain why a
  page that was correct yesterday is stale today.
- **(c) Keep the current behaviour and record the reasoning.** Rejected by the
  owner's ruling: documentation is not a release, and the two incidents are the
  cost of pretending it is.
- **Record the branch TIP in `SOURCE.json` instead of the files' commit.**
  Rejected: see above. It reproduces the same tree and makes every website push
  fail on any upstream commit to any of the three repositories.
- **Pin the overlay commit in the push gate as well as the tag.** Rejected: it
  would reproduce exactly and would never notice that the recorded documentation
  had moved, which is the one thing that tier exists to notice.

## Consequences

**A documentation fix reaches the site without a tag, and cannot be reverted by
somebody else's push.** That is the whole point, and it is what the two incidents
cost us.

**THE HONEST COST: a documentation-only commit can describe code that is merged
and not yet released.** Nothing stops an author from merging a feature and then,
in a separate documentation-only commit, writing about it. The old rule caught
that case by accident, because the feature's code sat in the same range. This
rule does not, and the owner accepts it: the alternative is the granularity that
reverted a published fix twice in two days. The mitigation is social, not
mechanical. Write the page in the same commit as the code, and it waits for the
tag, which is exactly right.

**A documentation-only push does not dispatch, so the daily run is the delivery
path.** `sync-docs.yml` fires on `repository_dispatch` from a member repo's
release job and on a 06:41 UTC schedule. A member repo's release job only runs on
a `v*` tag, so a documentation-only push wakes nothing. The fix therefore lands
on the site at the next scheduled run, up to roughly 24 hours later, plus the
build and the rollout the workflow waits up to 30 minutes for. Cross-repo
dispatch on a docs-only push was deliberately left out of this change; anybody
who needs a fix sooner runs
`gh workflow run sync-docs.yml -f budget=0` and gets it in minutes.

**The sync's log line says how many files came from the branch**, per source, and
that line is still the one answer to "why is my documentation fix not on the
site":

```
sync-docs: app — v0.35.1 plus 3 documentation file(s) from main at a205674, 1 more waiting for the next release. Quoting v0.35.1 at 28c4a87
```

**A page's GitHub links now point at the commit that page's words came from**,
which in a hybrid tree is not one sha for the whole repository. `shaOf` resolves
it per file; without it, the "edit this page" and source links on an overlaid
page would show a reader the copy that was just corrected away.

**The all-or-nothing verdict is gone, not kept beside the new one.**
`changedPaths` is deleted with its tests. `documentationOnly` survives unchanged
as the pure predicate "is every one of these paths documentation", which is now
asked of one commit's paths at a time instead of once of a whole range.

**The tracker's own verification command for this spec no longer matches the
code.** It counts occurrences of the string `documentationOnly` in
`scripts/sync-docs.ts`, on the assumption that a per-file rule would move that
call into a loop in that file. It did not: the per-file walk needs git, and this
repository's rule is that a pure function worth unit testing lives in
`scripts/lib/`. Satisfying the grep would mean writing the name into the file
three times for a counter. The honest replacement is
`grep -c "documentationAhead\|overlayBlame\|documentationFrom" scripts/sync-docs.ts`.

## References

- `.tracker/M240-sync-device-reach/04-the-website-quotes-documentation-at-the-wrong-granularity.md`
- `scripts/lib/clone.ts`, `documentationAhead` and `documentationOnly`
- `scripts/sync-docs.ts`, `released`, `worktree`, `shaOf` and `overlayBlame`
- `tests/unit/released-mixed-diff.test.ts`, every case above against real repositories
- `tests/unit/ref-resolution.test.ts`, the path predicate on its own
- [ADR-0005](0005-oxlint-and-anti-slop-are-the-lint-gate.md), the lint gate this had to pass
