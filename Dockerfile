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
# The prices and the free scans, the only three variables this build reads. app/pricing-config.ts
# explains why they are build variables and not constants: the site is prerendered to a file per
# URL, so there is no request time at which a price could be read instead. Unset means there is no
# pricing page, in the route table, the sitemap or the navigation, which is what every local build
# gets. PRICING_YEARLY_EUR only adds the yearly card to a page the monthly price already made.
# PRICING_TRIAL_SCANS is how many free AI scans a new account gets; unset means the site states no
# trial and no number, never a default. The pairs sit here rather than at the top of the stage so
# that changing a price does not invalidate the COPY layer above it.
ARG PRICING_PRICE_EUR
ENV PRICING_PRICE_EUR=$PRICING_PRICE_EUR
ARG PRICING_YEARLY_EUR
ENV PRICING_YEARLY_EUR=$PRICING_YEARLY_EUR
ARG PRICING_TRIAL_SCANS
ENV PRICING_TRIAL_SCANS=$PRICING_TRIAL_SCANS
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
