# Arnold Changelog Viewer

Scrapes Arnold renderer release notes from Autodesk's documentation and displays them in a clean, searchable UI. Hosted free on Cloudflare Pages with zero runtime infrastructure.

## How it works

```
GitHub Actions (weekly)
  → runs scraper.js
  → writes data/changelogs.json
  → commits to repo

Cloudflare Pages
  → detects new commit
  → redeploys (just serving static files)

Browser
  → loads index.html
  → fetches /data/changelogs.json
  → renders UI
```

No server, no database, no Worker, no runtime cost.

## File structure

```
arnold-changelog/
├── index.html                        ← Frontend UI
├── scraper.js                        ← Node.js scraper (run by GitHub Actions)
├── package.json                      ← npm deps (node-html-parser)
├── data/
│   └── changelogs.json               ← Generated output (committed to repo)
└── .github/
    └── workflows/
        └── scrape.yml                ← GitHub Actions workflow
```

## Setup

### 1. GitHub repo
Push this folder to a new GitHub repository.

### 2. Cloudflare Pages
1. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
2. **Create a project** → **Connect to Git** → select your repo
3. Build settings:
   - Framework preset: **None**
   - Build command: *(leave blank)*
   - Build output directory: `/` (root)
4. **Save and Deploy**

You'll get a `*.pages.dev` URL. You can attach a custom domain in Cloudflare's dashboard if you want.

### 3. Run the scraper for the first time
The `data/changelogs.json` file in the repo is empty by default.
To populate it, go to your GitHub repo → **Actions** tab → **Scrape Arnold Changelogs** → **Run workflow**.

After it finishes (~1-2 minutes), it commits the JSON and Cloudflare Pages auto-redeploys.

## Adding new Arnold versions

When Autodesk releases a new Arnold version, edit `scraper.js` and add a line to the `VERSIONS` array at the top:

```js
const VERSIONS = [
  { id: "7500", label: "7.5.0.0", series: "7x" },  // ← new version
  { id: "7451", label: "7.4.5.1", series: "7x" },
  ...
];
```

- `id` = version number with dots removed: `7.4.5.1` → `"7451"`
- `series` = URL path segment, `"7x"` for all 7.x releases
- When Arnold 8.x ships, check the Autodesk URL — series will likely be `"8x"`

Then push the change. GitHub Actions will run on schedule (Monday 9am UTC) and pick up the new version. Or trigger it manually from the Actions tab.

## Schedule

The scraper runs every **Monday at 9am UTC**. Arnold doesn't release weekly so this is more than frequent enough.

The scraper is smart about caching — it skips versions already in `changelogs.json` and only fetches new ones, so each weekly run is very fast.

To change the schedule, edit the cron in `.github/workflows/scrape.yml`:
```yaml
- cron: '0 9 * * 1'   # Every Monday 9am UTC
```

## Running locally

```bash
npm install
node scraper.js
```

This writes to `data/changelogs.json`. Open `index.html` in a browser (via a local server, e.g. `npx serve .`) to test.
