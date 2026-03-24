# Arnold Changelog Viewer

Scrapes Arnold Core and Arnold for Houdini (HtoA) release notes from Autodesk's documentation and displays them in a clean, searchable UI. Hosted free on Cloudflare Workers/Pages with zero runtime infrastructure.

## Features

- Browse **Arnold Core** and **HtoA** changelogs — switch via the header dropdown
- Full-text search across all versions with highlighted matches
- Version sidebar grouped by minor series (7.4.x, 6.3.x, etc.)
- **HtoA compatibility table** — HtoA version → Arnold Core → Houdini builds
- **Deep links** — share a link to any version or individual item via the link icon
- Light / dark theme toggle
- Code blocks rendered correctly
- System requirements formatted as bullet points
- Versions that fail to scrape are excluded from the sidebar

## How it works

```
GitHub Actions (weekly)
  → runs scraper.js          → writes data/changelogs.json
  → runs scraper-htoa.js     → writes data/changelogs-htoa.json
  → commits to repo

Cloudflare Workers/Pages
  → detects new commit
  → redeploys (serving static files)

Browser
  → loads index.html
  → fetches /data/changelogs.json (or changelogs-htoa.json)
  → renders UI, search runs client-side
```

No server, no database, no runtime cost.

## File structure

```
arnold-changelog/
├── index.html                        ← Frontend UI + client-side search
├── scraper.js                        ← Arnold Core scraper (GitHub Actions)
├── scraper-htoa.js                   ← HtoA scraper (GitHub Actions)
├── package.json                      ← npm deps (node-html-parser)
├── package-lock.json
├── wrangler.json                     ← Cloudflare Workers config
├── .wranglerignore                   ← Excludes dev files from upload
├── style/
│   └── main.css                      ← Design system (light/dark themes)
├── data/
│   ├── changelogs.json               ← Arnold Core output (committed to repo)
│   └── changelogs-htoa.json          ← HtoA output (committed to repo)
└── .github/
    └── workflows/
        ├── scrape.yml                ← Scrapes Arnold Core (Mon 9am UTC)
        └── scrape-htoa.yml           ← Scrapes HtoA (Mon 10am UTC)
```

## Setup

### 1. GitHub repo
Push this folder to a new GitHub repository.

### 2. Cloudflare Workers
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**
2. **Create** → **Pages** → **Connect to Git** → select your repo
3. Build settings:
   - Framework preset: **None**
   - Build command: `npx wrangler deploy`
   - Build output directory: *(leave blank)*
4. **Save and Deploy**

You'll get a `*.pages.dev` URL. You can attach a custom domain in Cloudflare's dashboard.

### 3. Run the scrapers for the first time
Both `data/changelogs.json` and `data/changelogs-htoa.json` are empty by default. To populate them, go to your GitHub repo → **Actions** tab and manually trigger each workflow:

- **Scrape Arnold Core Changelogs** — populates `data/changelogs.json`
- **Scrape Arnold HtoA Changelogs** — populates `data/changelogs-htoa.json`

Each run takes ~1–2 minutes, commits the JSON, and Cloudflare auto-redeploys.

## Adding new versions

When Autodesk releases a new version, add an entry to the `VERSIONS` array at the top of the relevant scraper file (newest first).

**Arnold Core** (`scraper.js`):
```js
{ id: "7500", label: "7.5.0.0", series: "7x" },
```

**HtoA** (`scraper-htoa.js`):
```js
{ id: "6461", label: "6.4.6.1", series: "6x" },
```

- `id` — version with dots removed: `7.4.5.1` → `"7451"`
- `label` — display string
- `series` — major version folder: `"7x"`, `"6x"`, `"5x"` etc.

Both scrapers are incremental — they skip versions already in the JSON, so only new entries are fetched each run.

## Deep links

Every version and individual changelog item has a shareable URL:

| Target | Hash format |
|---|---|
| Arnold Core version | `#7451` |
| HtoA version | `#htoa-6452` |
| Arnold Core item | `#7451-0-2` *(version, section, item index)* |
| HtoA item | `#htoa-6452-1-3` |

Click the link icon next to any version heading or hover over an item to reveal its link icon.

## Schedule

- Core scraper: every **Monday at 9am UTC** (`scrape.yml`)
- HtoA scraper: every **Monday at 10am UTC** (`scrape-htoa.yml`)

Both can also be triggered manually from the GitHub Actions tab.

## Running locally

```bash
npm install
node scraper.js        # Arnold Core
node scraper-htoa.js   # HtoA
```

Serve the root with a local server to test:

```bash
npx serve .
```
