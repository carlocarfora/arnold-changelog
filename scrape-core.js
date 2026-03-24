/**
 * scrape-core.js
 * Run by GitHub Actions when new versions are detected. Fetches Arnold Core
 * release note pages from Autodesk's static CDN and writes data/changelogs.json.
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
  // ── 7.x ──────────────────────────────────────────────────────────────────
  { id: "7451",  label: "7.4.5.1",  series: "7x" },
  { id: "7450",  label: "7.4.5.0",  series: "7x" },
  { id: "7442",  label: "7.4.4.2",  series: "7x" },
  { id: "7441",  label: "7.4.4.1",  series: "7x" },
  { id: "7440",  label: "7.4.4.0",  series: "7x" },
  { id: "7432",  label: "7.4.3.2",  series: "7x" },
  { id: "7431",  label: "7.4.3.1",  series: "7x" },
  { id: "7430",  label: "7.4.3.0",  series: "7x" },
  { id: "7422",  label: "7.4.2.2",  series: "7x" },
  { id: "7421",  label: "7.4.2.1",  series: "7x" },
  { id: "7420",  label: "7.4.2.0",  series: "7x" },
  { id: "7411",  label: "7.4.1.1",  series: "7x" },
  { id: "7410",  label: "7.4.1.0",  series: "7x" },
  { id: "7400",  label: "7.4.0.0",  series: "7x" },
  { id: "7372",  label: "7.3.7.2",  series: "7x" },
  { id: "7371",  label: "7.3.7.1",  series: "7x" },
  { id: "7370",  label: "7.3.7.0",  series: "7x" },
  { id: "7361",  label: "7.3.6.1",  series: "7x" },
  { id: "7360",  label: "7.3.6.0",  series: "7x" },
  { id: "7350",  label: "7.3.5.0",  series: "7x" },
  { id: "7341",  label: "7.3.4.1",  series: "7x" },
  { id: "7340",  label: "7.3.4.0",  series: "7x" },
  { id: "7331",  label: "7.3.3.1",  series: "7x" },
  { id: "7330",  label: "7.3.3.0",  series: "7x" },
  { id: "7321",  label: "7.3.2.1",  series: "7x" },
  { id: "7320",  label: "7.3.2.0",  series: "7x" },
  { id: "7311",  label: "7.3.1.1",  series: "7x" },
  { id: "7310",  label: "7.3.1.0",  series: "7x" },
  { id: "7300",  label: "7.3.0.0",  series: "7x" },
  { id: "7253",  label: "7.2.5.3",  series: "7x" },
  { id: "7252",  label: "7.2.5.2",  series: "7x" },
  { id: "7251",  label: "7.2.5.1",  series: "7x" },
  { id: "7250",  label: "7.2.5.0",  series: "7x" },
  { id: "7241",  label: "7.2.4.1",  series: "7x" },
  { id: "7240",  label: "7.2.4.0",  series: "7x" },
  { id: "7233",  label: "7.2.3.3",  series: "7x" },
  { id: "7232",  label: "7.2.3.2",  series: "7x" },
  { id: "7231",  label: "7.2.3.1",  series: "7x" },
  { id: "7230",  label: "7.2.3.0",  series: "7x" },
  { id: "7221",  label: "7.2.2.1",  series: "7x" },
  { id: "7220",  label: "7.2.2.0",  series: "7x" },
  { id: "7211",  label: "7.2.1.1",  series: "7x" },
  { id: "7210",  label: "7.2.1.0",  series: "7x" },
  { id: "7200",  label: "7.2.0.0",  series: "7x" },
  { id: "7144",  label: "7.1.4.4",  series: "7x" },
  { id: "7143",  label: "7.1.4.3",  series: "7x" },
  { id: "7142",  label: "7.1.4.2",  series: "7x" },
  { id: "7141",  label: "7.1.4.1",  series: "7x" },
  { id: "7140",  label: "7.1.4.0",  series: "7x" },
  { id: "7132",  label: "7.1.3.2",  series: "7x" },
  { id: "7131",  label: "7.1.3.1",  series: "7x" },
  { id: "7130",  label: "7.1.3.0",  series: "7x" },
  { id: "7122",  label: "7.1.2.2",  series: "7x" },
  { id: "7121",  label: "7.1.2.1",  series: "7x" },
  { id: "7120",  label: "7.1.2.0",  series: "7x" },
  { id: "7111",  label: "7.1.1.1",  series: "7x" },
  { id: "7110",  label: "7.1.1.0",  series: "7x" },
  { id: "7100",  label: "7.1.0.0",  series: "7x" },
  { id: "7003",  label: "7.0.0.3",  series: "7x" },
  { id: "7002",  label: "7.0.0.2",  series: "7x" },
  { id: "7001",  label: "7.0.0.1",  series: "7x" },
  { id: "7000",  label: "7.0.0.0",  series: "7x" },
  // ── 6.x ──────────────────────────────────────────────────────────────────
  { id: "6215",  label: "6.2.1.5",  series: "6x" },
  { id: "6214",  label: "6.2.1.4",  series: "6x" },
  { id: "6211",  label: "6.2.1.1",  series: "6x" },
  { id: "6210",  label: "6.2.1.0",  series: "6x" },
  { id: "6201",  label: "6.2.0.1",  series: "6x" },
  { id: "6200",  label: "6.2.0.0",  series: "6x" },
  { id: "6101",  label: "6.1.0.1",  series: "6x" },
  { id: "6100",  label: "6.1.0.0",  series: "6x" },
  { id: "6041",  label: "6.0.4.1",  series: "6x" },
  { id: "6040",  label: "6.0.4.0",  series: "6x" },
  { id: "6031",  label: "6.0.3.1",  series: "6x" },
  { id: "6030",  label: "6.0.3.0",  series: "6x" },
  { id: "6021",  label: "6.0.2.1",  series: "6x" },
  { id: "6020",  label: "6.0.2.0",  series: "6x" },
  { id: "6011",  label: "6.0.1.1",  series: "6x" },
  { id: "6010",  label: "6.0.1.0",  series: "6x" },
  { id: "6000",  label: "6.0.0.0",  series: "6x" },
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

// ── HTML escaping ─────────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Sanitize element HTML: keep <code> inline, make <a> absolute, strip rest ──
function sanitizeHtml(el, baseUrl) {
  function toHtml(node) {
    if (!node.tagName) {
      // Text node — decode then re-escape
      return escHtml(node.text || '');
    }
    const tag = node.tagName.toLowerCase();
    if (tag === 'code') {
      return `<code>${escHtml(node.text)}</code>`;
    }
    if (tag === 'a') {
      let href = node.getAttribute('href') || '';
      if (href && !href.startsWith('http') && !href.startsWith('//')) {
        try { href = new URL(href, baseUrl).href; } catch (_) {}
      }
      const inner = (node.childNodes || []).map(toHtml).join('');
      return (href && href.startsWith('http'))
        ? `<a href="${escHtml(href)}" target="_blank" rel="noopener">${inner}</a>`
        : inner;
    }
    if (tag === 'strong' || tag === 'b') {
      return `<strong>${(node.childNodes || []).map(toHtml).join('')}</strong>`;
    }
    // All other tags: recurse into children, drop the tag itself
    return (node.childNodes || []).map(toHtml).join('');
  }
  return (el.childNodes || []).map(toHtml).join('').replace(/\s+/g, ' ').trim();
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
          // Only extract block-level <pre> as separate code blocks; <code> stays inline
          const codeBlocks = [];
          li.querySelectorAll('pre').forEach(preEl => {
            const codeText = preEl.text.trim();
            if (codeText.length > 0) codeBlocks.push(codeText);
            preEl.remove();
          });
          const itemHtml = sanitizeHtml(li, url);
          const plainText = li.text.trim().replace(/\s+/g, ' ');
          if (plainText.length < 5 && !codeBlocks.length) return;
          const tickets = [...plainText.matchAll(/\b(ARNOLD-\d+|usd#\d+)\b/g)].map(m => m[1]);
          const item = { html: itemHtml, tickets };
          if (codeBlocks.length) item.codeBlocks = codeBlocks;
          items.push(item);
        });
      }
      // Paragraphs as fallback
      else if (el.tagName === 'P') {
        const codeBlocks = [];
        el.querySelectorAll('pre').forEach(preEl => {
          const codeText = preEl.text.trim();
          if (codeText.length > 0) codeBlocks.push(codeText);
          preEl.remove();
        });
        const itemHtml = sanitizeHtml(el, url);
        const plainText = el.text.trim().replace(/\s+/g, ' ');
        if (plainText.length > 15 && !/^copyright/i.test(plainText)) {
          const tickets = [...plainText.matchAll(/\b(ARNOLD-\d+|usd#\d+)\b/g)].map(m => m[1]);
          const item = { html: itemHtml, tickets };
          if (codeBlocks.length) item.codeBlocks = codeBlocks;
          items.push(item);
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
