# Repository Guidelines

This app is deployed as an independent Next.js zone at `/labs/pagibig-calculator` in the `joween.dev` Compose stack. Keep `basePath`, asset URLs, canonical metadata, structured data, and health checks correct for that permanent public path.

Use ordinary `<a>` elements for links to `joween.dev` routes outside this zone. Keep browser-storage and any future cookies namespaced to this project. The parent site owns origin-wide routing, robots, sitemap, availability fallback, and production deployment.

Import the header, footer, theme, and fonts from `@joween/site-shell` in the parent checkout. Render app content inside `SiteShell` with `zoneBasePath`. The shell owns the shared `theme` storage key. Keep calculator inputs under `pagibig-calculator:v1`. Read the parent's `docs/labs.md` before changing shell integration or deployment.

Before handing off a change, run `pnpm lint`, `pnpm test`, and `pnpm build`. A release is complete only after the parent repository pins the reviewed commit and its full Compose stack passes the Labs integration checks.
