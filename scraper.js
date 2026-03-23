/**
 * scraper.js
 * Run by GitHub Actions weekly. Fetches Arnold release note pages from
 * Autodesk's static CDN, parses them, and writes data/changelogs.json.
 *
 * To add a new Arnold version: add an entry to VERSIONS (newest first).
 * Format: { id: "7451", label: "7.4.5.1", series: "7x" }
 * The id is the version with dots removed: 7.4.5.1 → "7451"
 */

import { parse } from 'node-html-parser';
import { writeFileSync, readFileSync, existsSync } from 'fs';

// ── Known versions (newest first) ────────────────────────────────────────────
// ADD NEW VERSIONS HERE when Arnold releases a new version.
const VERSIONS = [
  { id: "7451",  label: "7.4.5.1",  series: "7x" },
  { id: "7411",  label: "7.4.1.1",  series: "7x" },
  { id: "7410",  label: "7.4.1.0",  series: "7x" },
  { id: "7400",  label: "7.4.0.0",  series: "7x" },
  { id: "7330",  label: "7.3.3.0",  series: "7x" },
  { id: "7320",  label: "7.3.2.0",  series: "7x" },
  { id: "7310",  label: "7.3.1.0",  series: "7x" },
  { id: "7300",  label: "7.3.0.0",  series: "7x" },
  { id: "7210",  label: "7.2.1.0",  series: "7x" },
  { id: "7200",  label: "7.2.0.0",  series: "7x" },
  { id: "7110",  label: "7.1.1.0",  series: "7x" },
  { id: "7100",  label: "7.1.0.0",  series: "7x" },
  { id: "7010",  label: "7.0.1.0",  series: "7x" },
  { id: "7000",  label: "7.0.0.0",  series: "7x" },
];

// ── URL builder ───────────────────────────────────────────────────────────────
// Newer versions use arnold_core_{id}_html.html
// Older versions use arnold_user_guide_ac_release_notes_ac_rn_{id}_html.html
function buildUrls(v) {
  const base = `https://help.autodesk.com/cloudhelp/ENU/AR-Core/files/ac-release-notes/ac-rn-${v.series}`;
  return [
    `${base}/arnold_core_${v.id}_html.html`,
    `${base}/arnold_user_guide_ac_release_notes_ac_rn_${v.id}_html.html`,
  ];
}

// ── Fetch with retries ────────────────────────────────────────────────────────
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      if (res.ok) return res;
      if (res.status === 404) return null; // version doesn't exist, skip silently
      console.warn(`  HTTP ${res.status} on attempt ${i + 1} for ${url}`);
    } catch (e) {
      console.warn(`  Fetch error on attempt ${i + 1}: ${e.message}`);
    }
    if (i < retries - 1) await new Promise(r => setTimeout(r, 2000 * (i + 1)));
  }
  return null;
}

// ── Parse a single changelog page ────────────────────────────────────────────
function parsePage(html, version, url) {
  const root = parse(html);

  // Remove nav, header, footer, script, style noise
  ['nav', 'header', 'footer', 'script', 'style', '.navigation', '#navigation'].forEach(sel => {
    root.querySelectorAll(sel).forEach(el => el.remove());
  });

  // ── Intro paragraph ───────────────────────────────────────────────────────
  const firstP = root.querySelector('p');
  const intro = firstP?.text?.trim() || '';

  // ── Detect release type ───────────────────────────────────────────────────
  let releaseType = 'release';
  const introLower = intro.toLowerCase();
  if (/bug.fix/.test(introLower)) releaseType = 'bugfix';
  else if (/feature release/.test(introLower)) releaseType = 'feature';
  else if (/enhancements|improvements/.test(introLower)) releaseType = 'feature';

  // ── Extract sections ──────────────────────────────────────────────────────
  const sections = [];
  const headings = root.querySelectorAll('h2, h3');

  for (const heading of headings) {
    const headingText = heading.text.trim();
    if (!headingText || headingText.length > 100) continue;
    if (/copyright|navigation|contents|system req/i.test(headingText)) continue;

    // Collect sibling elements until next heading
    const items = [];
    let el = heading.nextElementSibling;
    while (el && !['H2', 'H3'].includes(el.tagName)) {
      // List items
      if (el.tagName === 'UL' || el.tagName === 'OL') {
        el.querySelectorAll('li').forEach(li => {
          const text = li.text.trim().replace(/\s+/g, ' ');
          if (text.length < 5) return;
          const tickets = [...text.matchAll(/\b(ARNOLD-\d+|usd#\d+)\b/g)].map(m => m[1]);
          items.push({ text, tickets });
        });
      }
      // Paragraphs as fallback
      else if (el.tagName === 'P') {
        const text = el.text.trim().replace(/\s+/g, ' ');
        if (text.length > 15 && !/^copyright/i.test(text)) {
          const tickets = [...text.matchAll(/\b(ARNOLD-\d+|usd#\d+)\b/g)].map(m => m[1]);
          items.push({ text, tickets });
        }
      }
      el = el.nextElementSibling;
    }

    if (items.length > 0) {
      sections.push({ heading: headingText, items });
    }
  }

  // ── System requirements ───────────────────────────────────────────────────
  let systemRequirements = null;
  const sysReqHeading = root.querySelectorAll('h2, h3').find(h =>
    /system req/i.test(h.text)
  );
  if (sysReqHeading) {
    const parts = [];
    let el = sysReqHeading.nextElementSibling;
    while (el && !['H2', 'H3'].includes(el.tagName)) {
      const text = el.text.trim().replace(/\s+/g, ' ');
      if (text) parts.push(text);
      el = el.nextElementSibling;
    }
    systemRequirements = parts.join(' ') || null;
  }

  return {
    version:            version.label,
    versionId:          version.id,
    releaseType,
    intro,
    sections,
    systemRequirements,
    sourceUrl:          url,
    scrapedAt:          new Date().toISOString(),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // Load existing data so we can skip versions that haven't changed
  const outPath = 'data/changelogs.json';
  let existing = {};
  if (existsSync(outPath)) {
    try {
      const prev = JSON.parse(readFileSync(outPath, 'utf8'));
      for (const entry of (prev.changelogs || [])) {
        existing[entry.versionId] = entry;
      }
      console.log(`Loaded ${Object.keys(existing).length} existing entries.`);
    } catch (_) {}
  }

  const changelogs = [];
  let fetched = 0;
  let skipped = 0;
  let failed  = 0;

  for (const version of VERSIONS) {
    // Skip if already scraped successfully (content won't change for old versions)
    if (existing[version.id] && !existing[version.id].error) {
      console.log(`✓ Skip  ${version.label} (already in cache)`);
      changelogs.push(existing[version.id]);
      skipped++;
      continue;
    }

    const urls = buildUrls(version);
    let res = null;
    let url = null;
    for (const candidate of urls) {
      console.log(`→ Fetch ${version.label}  ${candidate}`);
      res = await fetchWithRetry(candidate);
      if (res) { url = candidate; break; }
    }

    if (!res) {
      console.warn(`✗ Failed ${version.label}`);
      changelogs.push({
        version:   version.label,
        versionId: version.id,
        error:     'Page not found or fetch failed',
        sourceUrl: urls[0],
        scrapedAt: new Date().toISOString(),
      });
      failed++;
      continue;
    }

    const html = await res.text();

    // Sanity check — make sure we got real content, not a redirect page
    if (html.length < 500 || !html.includes('<')) {
      console.warn(`✗ Empty response for ${version.label}`);
      changelogs.push({ version: version.label, versionId: version.id, error: 'Empty response', sourceUrl: url, scrapedAt: new Date().toISOString() });
      failed++;
      continue;
    }

    const parsed = parsePage(html, version, url);
    changelogs.push(parsed);
    fetched++;

    console.log(`✓ Done  ${version.label}  (${parsed.sections.length} sections, ${parsed.sections.reduce((n,s) => n + s.items.length, 0)} items)`);

    // Polite delay between requests
    await new Promise(r => setTimeout(r, 1500));
  }

  // Write output
  const output = {
    versions:   VERSIONS,
    changelogs,
    updatedAt:  new Date().toISOString(),
  };

  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nDone. Fetched: ${fetched}, Skipped: ${skipped}, Failed: ${failed}`);
  console.log(`Written to ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
