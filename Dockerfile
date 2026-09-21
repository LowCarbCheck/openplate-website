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
# The price, and the ONE variable this build reads. app/pricing-config.ts explains why it is a
# build variable and not a constant: the site is prerendered to a file per URL, so there is no
# request time at which a price could be read instead. Unset means there is no pricing page, in
# the route table, the sitemap or the navigation, which is what every local build gets. The pair
# sits here rather than at the top of the stage so that changing the price does not invalidate
# the COPY layer above it.
ARG PRICING_PRICE_EUR
ENV PRICING_PRICE_EUR=$PRICING_PRICE_EUR
# src/generated is committed (docs and translations are synced and translated out of band, by
# scripts/sync-docs.ts and scripts/translate-docs.ts, never inside this build) so the build needs
# no network beyond the pnpm install above.
RUN CI=true pnpm build

# ── The site ─────────────────────────────────────────────────────────────────────────────────────
FROM nginx:1-alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build/client /usr/share/nginx/html
EXPOSE 80
