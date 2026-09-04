# openplate.de, the marketing and docs site, prerendered to static files.
#
# Bay routes several host names at one container and carries no redirect middleware, so every
# host redirect (www -> apex, and the old app paths that moved to beta.openplate.de) lives in
# nginx.conf, not here. See that file for the reasoning.

# ── The build ────────────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
# Manifest, lockfile and workspace config first, so a dependency-free commit reuses this layer.
# corepack reads package.json's packageManager field and pins pnpm to that exact version, the
# same one the lockfile was generated with. pnpm-workspace.yaml carries allowBuilds (pnpm 11
# hard-fails on an unapproved native build script otherwise) and must be present before install.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack prepare --activate
RUN CI=true pnpm install --frozen-lockfile
COPY . .
# src/generated is committed (docs and translations are synced and translated out of band, by
# scripts/sync-docs.ts and scripts/translate-docs.ts, never inside this build) so the build reads
# no env and needs no network beyond the pnpm install above.
RUN CI=true pnpm build

# ── The site ─────────────────────────────────────────────────────────────────────────────────────
FROM nginx:1-alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build/client /usr/share/nginx/html
EXPOSE 80
