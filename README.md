# Arnold Changelog Viewer

Scrapes Arnold renderer release notes from Autodesk's documentation and displays them in a clean, searchable UI. Hosted free on Cloudflare Workers/Pages with zero runtime infrastructure.

## Features

- Full-text search across all versions with highlighted matches
- Version sidebar grouped by minor series (7.4.x, 7.3.x, etc.)
- Light / dark theme toggle
- Code blocks rendered correctly
- System requirements formatted as bullet points
- Versions that fail to scrape are excluded from the sidebar

## How it works

```
GitHub Actions (weekly)
  → runs scraper.js
  → writes data/changelogs.json
  → commits to repo

Cloudflare Workers/Pages
  → detects new commit
  → redeploys (serving static files)

Browser
  → loads index.html
  → fetches /data/changelogs.json
  → renders UI, search runs client-side
```

No server, no database, no runtime cost.

## File structure

```
arnold-changelog/
├── index.html                        ← Frontend UI + client-side search
├── scraper.js                        ← Node.js scraper (run by GitHub Actions)
├── package.json                      ← npm deps (node-html-parser)
├── package-lock.json
├── wrangler.json                     ← Cloudflare Workers config
├── .wranglerignore                   ← Excludes dev files from upload
├── style/
│   └── main.css                      ← Design system (light/dark themes)
├── data/
│   └── changelogs.json               ← Generated output (committed to repo)
└── .github/
    └── workflows/
        └── scrape.yml                ← GitHub Actions workflow
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

### 3. Run the scraper for the first time
`data/changelogs.json` is empty by default. To populate it, go to your GitHub repo → **Actions** tab → **Scrape Arnold Changelogs** → **Run workflow**.

After it finishes (~1–2 minutes), it commits the JSON and Cloudflare auto-redeploys.

## Adding new Arnold versions

When Autodesk releases a new Arnold version, edit `scraper.js` and add an entry to the `VERSIONS` array at the top:

```js
const VERSIONS = [
  { id: "7500", label: "7.5.0.0", series: "7x" },  // ← new version
  { id: "7451", label: "7.4.5.1", series: "7x" },
  ...
];
```

- `id` — version number with dots removed: `7.4.5.1` → `"7451"`
- `label` — display string
- `series` — URL path segment; `"7x"` for all 7.x releases (check Autodesk URL for 8.x)

Push the change. The scraper is incremental — it skips versions already in `changelogs.json`, so only new entries are fetched each run.

## Schedule

Runs every **Monday at 9am UTC**. To change it, edit the cron in `.github/workflows/scrape.yml`:

```yaml
- cron: '0 9 * * 1'
```

## Running locally

```bash
npm install
node scraper.js
```

Writes to `data/changelogs.json`. Serve the root with a local server to test:

```bash
npx serve .
```
