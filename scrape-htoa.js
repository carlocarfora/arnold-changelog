/**
 * scrape-htoa.js
 * Run by GitHub Actions when new versions are detected. Fetches Arnold for
 * Houdini (HtoA) release note pages from Autodesk's CDN and writes data/changelogs-htoa.json.
 *
 * To add a new HtoA version: add an entry to VERSIONS (newest first).
 * 6.x format: { id: "6461", label: "6.4.6.1", series: "6x" }
 * 5.x format: { id: "5631", label: "5.6.3.1", series: "5x" }  ← 4-part
 *             { id: "541",  label: "5.4.1",   series: "5x" }  ← 3-part
 *
 * 6.x URL: arnold_for_houdini_{id}_html.html
 * 5.x URL: arnold_for_houdini_ah_htoa_5x_ah_HtoA_{label_with_underscores}_html.html
 */

import { parse } from 'node-html-parser';
import { writeFileSync, readFileSync, existsSync } from 'fs';

// ── Known versions (newest first) ────────────────────────────────────────────
// ADD NEW VERSIONS HERE when HtoA releases a new version.
const VERSIONS = [
  // ── 6.x ──────────────────────────────────────────────────────────────────
  { id: "6510", label: "6.5.1.0", series: "6x" },
  { id: "6461", label: "6.4.6.1", series: "6x" },
  { id: "6460", label: "6.4.6.0", series: "6x" },
  { id: "6453", label: "6.4.5.3", series: "6x" },
  { id: "6452", label: "6.4.5.2", series: "6x" },
  { id: "6451", label: "6.4.5.1", series: "6x" },
  { id: "6450", label: "6.4.5.0", series: "6x" },
  { id: "6441", label: "6.4.4.1", series: "6x" },
  { id: "6440", label: "6.4.4.0", series: "6x" },
  { id: "6431", label: "6.4.3.1", series: "6x" },
  { id: "6430", label: "6.4.3.0", series: "6x" },
  { id: "6423", label: "6.4.2.3", series: "6x" },
  { id: "6422", label: "6.4.2.2", series: "6x" },
  { id: "6421", label: "6.4.2.1", series: "6x" },
  { id: "6420", label: "6.4.2.0", series: "6x" },
  { id: "6411", label: "6.4.1.1", series: "6x" },
  { id: "6410", label: "6.4.1.0", series: "6x" },
  { id: "6371", label: "6.3.7.1", series: "6x" },
  { id: "6370", label: "6.3.7.0", series: "6x" },
  { id: "6361", label: "6.3.6.1", series: "6x" },
  { id: "6360", label: "6.3.6.0", series: "6x" },
  { id: "6351", label: "6.3.5.1", series: "6x" },
  { id: "6350", label: "6.3.5.0", series: "6x" },
  { id: "6341", label: "6.3.4.1", series: "6x" },
  { id: "6340", label: "6.3.4.0", series: "6x" },
  { id: "6331", label: "6.3.3.1", series: "6x" },
  { id: "6330", label: "6.3.3.0", series: "6x" },
  { id: "6322", label: "6.3.2.2", series: "6x" },
  { id: "6321", label: "6.3.2.1", series: "6x" },
  { id: "6320", label: "6.3.2.0", series: "6x" },
  { id: "6311", label: "6.3.1.1", series: "6x" },
  { id: "6310", label: "6.3.1.0", series: "6x" },
  { id: "6253", label: "6.2.5.3", series: "6x" },
  { id: "6252", label: "6.2.5.2", series: "6x" },
  { id: "6251", label: "6.2.5.1", series: "6x" },
  { id: "6250", label: "6.2.5.0", series: "6x" },
  { id: "6243", label: "6.2.4.3", series: "6x" },
  { id: "6242", label: "6.2.4.2", series: "6x" },
  { id: "6241", label: "6.2.4.1", series: "6x" },
  { id: "6240", label: "6.2.4.0", series: "6x" },
  { id: "6234", label: "6.2.3.4", series: "6x" },
  { id: "6233", label: "6.2.3.3", series: "6x" },
  { id: "6232", label: "6.2.3.2", series: "6x" },
  { id: "6231", label: "6.2.3.1", series: "6x" },
  { id: "6230", label: "6.2.3.0", series: "6x" },
  { id: "6221", label: "6.2.2.1", series: "6x" },
  { id: "6220", label: "6.2.2.0", series: "6x" },
  { id: "6211", label: "6.2.1.1", series: "6x" },
  { id: "6210", label: "6.2.1.0", series: "6x" },
  { id: "6144", label: "6.1.4.4", series: "6x" },
  { id: "6143", label: "6.1.4.3", series: "6x" },
  { id: "6142", label: "6.1.4.2", series: "6x" },
  { id: "6141", label: "6.1.4.1", series: "6x" },
  { id: "6140", label: "6.1.4.0", series: "6x" },
  { id: "6133", label: "6.1.3.3", series: "6x" },
  { id: "6130", label: "6.1.3.0", series: "6x" },
  { id: "6110", label: "6.1.1.0", series: "6x" },
  { id: "6100", label: "6.1.0.0", series: "6x" },
  { id: "6022", label: "6.0.2.2", series: "6x" },
  { id: "6021", label: "6.0.2.1", series: "6x" },
  { id: "6020", label: "6.0.2.0", series: "6x" },
  { id: "6010", label: "6.0.1.0", series: "6x" },
  { id: "6000", label: "6.0.0.0", series: "6x" },
  // ── 5.x ──────────────────────────────────────────────────────────────────
  { id: "5631", label: "5.6.3.1", series: "5x" },
  { id: "5630", label: "5.6.3.0", series: "5x" },
  { id: "5620", label: "5.6.2.0", series: "5x" },
  { id: "5610", label: "5.6.1.0", series: "5x" },
  { id: "5602", label: "5.6.0.2", series: "5x" },
  { id: "5601", label: "5.6.0.1", series: "5x" },
  { id: "5600", label: "5.6.0.0", series: "5x" },
  { id: "5502", label: "5.5.0.2", series: "5x" },
  { id: "5501", label: "5.5.0.1", series: "5x" },
  { id: "5500", label: "5.5.0.0", series: "5x" },
  { id: "541",  label: "5.4.1",   series: "5x" },
  { id: "540",  label: "5.4.0",   series: "5x" },
  { id: "530",  label: "5.3.0",   series: "5x" },
  { id: "521",  label: "5.2.1",   series: "5x" },
  { id: "520",  label: "5.2.0",   series: "5x" },
  { id: "511",  label: "5.1.1",   series: "5x" },
  { id: "510",  label: "5.1.0",   series: "5x" },
  { id: "503",  label: "5.0.3",   series: "5x" },
  { id: "502",  label: "5.0.2",   series: "5x" },
  { id: "501",  label: "5.0.1",   series: "5x" },
];

// ── URL builder ───────────────────────────────────────────────────────────────
// 6.x: arnold_for_houdini_{id}_html.html
// 5.x: arnold_for_houdini_ah_htoa_5x_ah_HtoA_{label_underscored}_html.html
function buildUrls(v) {
  const base = `https://help.autodesk.com/cloudhelp/ENU/AR-Houdini/files/ah-release-notes/ah-htoa-${v.series}`;
  if (v.series === '6x') {
    return [`${base}/arnold_for_houdini_${v.id}_html.html`];
  } else {
    const underscored = v.label.replace(/\./g, '_');
    return [`${base}/arnold_for_houdini_ah_htoa_5x_ah_HtoA_${underscored}_html.html`];
  }
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
      if (res.status === 404) return null;
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
    return (node.childNodes || []).map(toHtml).join('');
  }
  return (el.childNodes || []).map(toHtml).join('').replace(/\s+/g, ' ').trim();
}

// ── Parse a single HtoA changelog page ───────────────────────────────────────
function parsePage(html, version, url) {
  const root = parse(html);

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
    if (/copyright|navigation|contents|system req|installation/i.test(headingText)) continue;

    const items = [];
    let el = heading.nextElementSibling;
    while (el && !['H2', 'H3'].includes(el.tagName)) {
      if (el.tagName === 'UL' || el.tagName === 'OL') {
        el.querySelectorAll('li').forEach(li => {
          const codeBlocks = [];
          li.querySelectorAll('pre').forEach(preEl => {
            const codeText = preEl.text.trim();
            if (codeText.length > 0) codeBlocks.push(codeText);
            preEl.remove();
          });
          const itemHtml = sanitizeHtml(li, url);
          const plainText = li.text.trim().replace(/\s+/g, ' ');
          if (plainText.length < 5 && !codeBlocks.length) return;
          const tickets = [...plainText.matchAll(/\b(HTOA-\d+|ARNOLD-\d+|usd#\d+)\b/g)].map(m => m[1]);
          const item = { html: itemHtml, tickets };
          if (codeBlocks.length) item.codeBlocks = codeBlocks;
          items.push(item);
        });
      } else if (el.tagName === 'P') {
        const codeBlocks = [];
        el.querySelectorAll('pre').forEach(preEl => {
          const codeText = preEl.text.trim();
          if (codeText.length > 0) codeBlocks.push(codeText);
          preEl.remove();
        });
        const itemHtml = sanitizeHtml(el, url);
        const plainText = el.text.trim().replace(/\s+/g, ' ');
        if (plainText.length > 15 && !/^copyright/i.test(plainText)) {
          const tickets = [...plainText.matchAll(/\b(HTOA-\d+|ARNOLD-\d+|usd#\d+)\b/g)].map(m => m[1]);
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

  // ── Compatibility: Arnold Core version + Houdini versions + GCC versions ───
  // Arnold Core version appears in the intro: "…using Arnold 7.4.4.1…"
  const arnoldMatch = intro.match(/Arnold\s+(\d+\.\d+\.\d+\.\d+)/);
  const arnoldCoreVersion = arnoldMatch ? arnoldMatch[1] : null;

  const sysReqText = systemRequirements || '';

  // Houdini builds appear in system requirements: "20.5.684", "21.0.440" etc.
  const houdiniMatches = [...sysReqText.matchAll(/\b((?:19|20|21|22)\.\d+\.\d+)\b/g)];
  const houdiniVersions = [...new Set(houdiniMatches.map(m => m[1]))];

  // GCC versions appear as "(gcc X.X.X)" in system requirements
  const gccMatches = [...sysReqText.matchAll(/\(gcc\s+(\d+(?:\.\d+)+)\)/gi)];
  const gccVersions = [...new Set(gccMatches.map(m => m[1]))];

  return {
    version:            version.label,
    versionId:          version.id,
    arnoldCoreVersion,
    houdiniVersions,
    gccVersions,
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
  const outPath = 'data/changelogs-htoa.json';
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

    await new Promise(r => setTimeout(r, 1500));
  }

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
