# TODO

## Done

- ~~**HtoA scraping** — scrape HtoA (Houdini to Arnold) release notes alongside Arnold Core~~ ✓
- ~~**Share button** — deep links to specific versions and individual changelog items~~ ✓
- ~~**Compatibility table** — HtoA version → Arnold Core → supported Houdini builds~~ ✓
- ~~**HtoA UI** — header dropdown to switch between Arnold Core and HtoA; independent search per dataset~~ ✓

## Planned

- **Auto version discovery** — a weekly GitHub Action checks the Autodesk docs for new versions and, if found, updates the `VERSIONS` array in the relevant scraper file and triggers the scrape. Core and HtoA scrapers only run when new versions are actually detected, avoiding unnecessary weekly runs.
