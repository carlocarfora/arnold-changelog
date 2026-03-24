/**
 * version-checker.js
 * Fetches Arnold Core and HtoA release note index pages, compares discovered
 * versions against the VERSIONS arrays in the scraper files, and inserts any
 * new entries found.
 *
 * Sets GitHub Actions outputs:
 *   new_core=true|false
 *   new_htoa=true|false
 */

import { parse } from 'node-html-parser';
import { readFileSync, writeFileSync, appendFileSync } from 'fs';

// ── Index pages to check ──────────────────────────────────────────────────────
const INDEX_PAGES = {
  core: [
    'https://help.autodesk.com/cloudhelp/ENU/AR-Core/files/ac-release-notes/arnold_user_guide_ac_release_notes_ac_rn_7x_html.html',
    'https://help.autodesk.com/cloudhelp/ENU/AR-Core/files/ac-release-notes/arnold_user_guide_ac_release_notes_ac_rn_6x_html.html',
  ],
  htoa: [
    'https://help.autodesk.com/cloudhelp/ENU/AR-Houdini/files/ah-release-notes/arnold_for_houdini_ah_Release_Notes_6x_html.html',
    'https://help.autodesk.com/cloudhelp/ENU/AR-Houdini/files/ah-release-notes/arnold_for_houdini_ah_Release_Notes_5x_html.html',
  ],
};

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) { console.warn(`  HTTP ${res.status} for ${url}`); return null; }
    return res.text();
  } catch (e) {
    console.warn(`  Fetch error for ${url}: ${e.message}`);
    return null;
  }
}

// ── Parse versions from an index page ────────────────────────────────────────
// Returns array of { id, label, series }
function parseIndexPage(html, product) {
  const root = parse(html);
  const versions = [];

  for (const link of root.querySelectorAll('ul.ullinks li a')) {
    const href = link.getAttribute('href') || '';
    const text = link.text.trim();

    if (product === 'core') {
      // href: ac-rn-7x/arnold_core_7451_html.html
      // text: "7.4.5.1"
      const m = href.match(/ac-rn-(\d+x)\/arnold_(?:core|user_guide[^/]*)_(\d+)_html\.html/);
      if (!m) continue;
      const series = m[1];
      const id     = m[2];
      const label  = text.replace(/[^\d.]/g, '').trim();
      if (/^\d+\.\d+\.\d+(\.\d+)?$/.test(label)) {
        versions.push({ id, label, series });
      }
    } else {
      // 6.x href: ah-htoa-6x/arnold_for_houdini_6461_html.html
      // 5.x href: ah-htoa-5x/arnold_for_houdini_ah_htoa_5x_ah_HtoA_5_6_3_1_html.html
      // text: "HtoA 6.4.6.1" or "HtoA 5.4.1"
      const labelMatch = text.match(/HtoA\s+([\d.]+)/i);
      if (!labelMatch) continue;
      const label = labelMatch[1];
      if (!/^\d+\.\d+(\.\d+){1,2}$/.test(label)) continue;

      const seriesMatch = href.match(/ah-htoa-(\d+x)\//);
      if (!seriesMatch) continue;
      const series = seriesMatch[1];

      // For 6.x the compact id is in the href; for 5.x derive it from the label
      const compactMatch = href.match(/arnold_for_houdini_(\d{3,4})_html\.html/);
      const id = compactMatch ? compactMatch[1] : label.replace(/\./g, '');

      versions.push({ id, label, series });
    }
  }

  return versions;
}

// ── Get existing IDs from a scraper file ──────────────────────────────────────
function getExistingIds(scraperPath) {
  const content = readFileSync(scraperPath, 'utf8');
  const matches = [...content.matchAll(/\{ id: "(\w+)"/g)];
  return new Set(matches.map(m => m[1]));
}

// ── Sort versions newest-first ────────────────────────────────────────────────
function sortNewestFirst(versions) {
  return [...versions].sort((a, b) => {
    const av = a.label.split('.').map(Number);
    const bv = b.label.split('.').map(Number);
    for (let i = 0; i < Math.max(av.length, bv.length); i++) {
      const diff = (bv[i] || 0) - (av[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });
}

// ── Insert new versions into a scraper file ───────────────────────────────────
function insertVersions(scraperPath, newVersions) {
  let content = readFileSync(scraperPath, 'utf8');

  // Group by series, sort each group newest-first
  const bySeries = new Map();
  for (const v of newVersions) {
    if (!bySeries.has(v.series)) bySeries.set(v.series, []);
    bySeries.get(v.series).push(v);
  }

  for (const [series, versions] of bySeries) {
    const sorted = sortNewestFirst(versions);
    const lines  = sorted.map(v => `  { id: "${v.id}", label: "${v.label}", series: "${v.series}" },`).join('\n') + '\n';

    // Series comments in the file use "7.x", "6.x" format (e.g. "// ── 7.x ──")
    const seriesLabel = series.replace(/(\d+)x$/, '$1.x');
    const seriesCommentRe = new RegExp(`(  // ── ${seriesLabel} ──[^\\n]*\\n)`);

    if (seriesCommentRe.test(content)) {
      // Insert immediately after the series comment
      content = content.replace(seriesCommentRe, `$1${lines}`);
    } else {
      // No series comment found — insert at the very top of the VERSIONS array
      content = content.replace(/(const VERSIONS = \[\n)/, `$1${lines}`);
    }
  }

  writeFileSync(scraperPath, content);
}

// ── Set GitHub Actions output ─────────────────────────────────────────────────
function setOutput(name, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (file) appendFileSync(file, `${name}=${value}\n`);
  console.log(`  → output: ${name}=${value}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  let newCore = false;
  let newHtoa = false;

  for (const [product, urls] of Object.entries(INDEX_PAGES)) {
    const scraperFile  = product === 'core' ? 'scraper.js' : 'scraper-htoa.js';
    const existingIds  = getExistingIds(scraperFile);
    const allDiscovered = [];

    for (const url of urls) {
      console.log(`\nChecking ${url}`);
      const html = await fetchPage(url);
      if (!html) continue;

      const found = parseIndexPage(html, product);
      console.log(`  Parsed ${found.length} versions from page`);

      for (const v of found) {
        if (!existingIds.has(v.id)) {
          console.log(`  ✦ New: ${v.label} (id: ${v.id}, series: ${v.series})`);
          allDiscovered.push(v);
          existingIds.add(v.id); // prevent duplicates across multiple index pages
        }
      }
    }

    if (allDiscovered.length > 0) {
      console.log(`\nInserting ${allDiscovered.length} new ${product} version(s) into ${scraperFile}`);
      insertVersions(scraperFile, allDiscovered);
      if (product === 'core') newCore = true;
      else newHtoa = true;
    } else {
      console.log(`\nNo new ${product} versions found.`);
    }
  }

  setOutput('new_core', String(newCore));
  setOutput('new_htoa', String(newHtoa));
}

main().catch(e => { console.error(e); process.exit(1); });
