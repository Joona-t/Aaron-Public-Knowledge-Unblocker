// Aaron — Public Knowledge Unblocker
// In memory of Aaron Swartz (1986–2013)
// "Information is power. But like all power, there are those who want to keep it for themselves."
//
// Architecture:
//   1. Extract DOI from page (meta tags, URL, visible text)
//   2. Check sessionStorage cache — instant if cached
//   3. Query OpenAlex API — free, no auth, CC0 licensed
//   4. Render panel with results, ranked by source quality
//
// OpenAlex incorporates Unpaywall, Crossref, MAG, ORCID, and ROR data.
// One API call covers what previously required two.
//
// No data is collected. No analytics. No backend. All queries go directly
// from the user's browser to the OpenAlex API. MIT licensed.

'use strict';

// ─── Constants ───────────────────────────────────────────────────────────────

const OPENALEX_API  = 'https://api.openalex.org/works/doi:';
const CACHE_PREFIX  = 'aaron:';
const PANEL_ID      = 'aaron-panel';

// Source quality order (higher = prefer displaying first)
const SOURCE_RANK = {
  'publisher':  5,   // official OA from publisher (gold OA)
  'repository': 4,   // institutional repo, PubMed Central, etc.
  'preprint':   3,   // arXiv, bioRxiv, SSRN
  'openalex':   1,   // OpenAlex metadata link
};

// ─── Cache ───────────────────────────────────────────────────────────────────
// sessionStorage: persists within tab session, clears on tab close.
// No privacy concern — nothing survives past the session.

function getCached(doi) {
  try { return JSON.parse(sessionStorage.getItem(CACHE_PREFIX + doi)); }
  catch { return null; }
}

function setCache(doi, data) {
  try { sessionStorage.setItem(CACHE_PREFIX + doi, JSON.stringify(data)); }
  catch { /* quota exceeded, ignore */ }
}

// ─── DOI Extraction ──────────────────────────────────────────────────────────
// Publishers are inconsistent. We try every known location in order of reliability.

function extractDOI() {
  // 1. <meta name="citation_doi"> — Google Scholar convention, most reliable
  const metaCitationDoi = document.querySelector('meta[name="citation_doi"]');
  if (metaCitationDoi) {
    const doi = normalizeDOI(metaCitationDoi.getAttribute('content'));
    if (doi) return doi;
  }

  // 2. <meta name="dc.identifier"> — Dublin Core
  const metaDC = document.querySelector('meta[name="dc.identifier"], meta[name="DC.identifier"]');
  if (metaDC) {
    const doi = normalizeDOI(metaDC.getAttribute('content'));
    if (doi) return doi;
  }

  // 3. <meta property="og:url"> — often contains doi.org URL
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) {
    const doi = normalizeDOI(ogUrl.getAttribute('content'));
    if (doi) return doi;
  }

  // 4. <link rel="canonical">
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    const doi = normalizeDOI(canonical.getAttribute('href'));
    if (doi) return doi;
  }

  // 5. Current page URL — doi.org resolver or publisher URL with DOI path
  const urlDoi = normalizeDOI(location.href);
  if (urlDoi) return urlDoi;

  // 6. <meta name="prism.doi"> — Springer/Nature
  const prism = document.querySelector('meta[name="prism.doi"]');
  if (prism) {
    const doi = normalizeDOI(prism.getAttribute('content'));
    if (doi) return doi;
  }

  // 7. Visible text scan — EXPENSIVE: forces full layout reflow via innerText.
  // Only reaches here if all 6 meta tag methods returned null.
  // Scans first 5000 chars to bound the cost.
  const doiRegex = /\b(10\.\d{4,}(?:\.\d+)*\/[^\s"'<>]+)/;
  const bodyText = document.body.innerText.substring(0, 5000);
  const match = bodyText.match(doiRegex);
  if (match) return match[1].replace(/[.,;)]+$/, ''); // strip trailing punctuation

  return null;
}

function normalizeDOI(raw) {
  if (!raw) return null;
  // Strip doi.org URLs: https://doi.org/10.1000/xyz → 10.1000/xyz
  const stripped = raw.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  const match = stripped.match(/(10\.\d{4,}(?:\.\d+)*\/[^\s"'<>?#]+)/);
  if (!match) return null;
  return match[1].replace(/[.,;)]+$/, ''); // strip trailing punctuation artifacts
}

// ─── API Query ───────────────────────────────────────────────────────────────

async function queryOpenAlex(doi) {
  const url = `${OPENALEX_API}${encodeURIComponent(doi)}`;
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('[Aaron] OpenAlex query failed:', e.message);
    return null;
  }
}

// ─── Result Normalization ────────────────────────────────────────────────────
// OpenAlex returns locations in several places. We normalize to a flat list.
//
// location = { url, source, type, label, version, rank, note? }
//   type: 'pdf' (direct PDF link) or 'landing' (landing page, no direct PDF)

function parseOpenAlex(data) {
  if (!data) return [];
  const results = [];

  // Primary location
  const primary = data.primary_location;
  if (primary?.is_oa) {
    if (primary.pdf_url) {
      results.push({
        url:     primary.pdf_url,
        source:  'publisher',
        type:    'pdf',
        label:   primary.source?.display_name || 'Publisher (Open Access)',
        version: 'published',
        rank:    SOURCE_RANK['publisher'],
      });
    } else if (primary.landing_page_url) {
      results.push({
        url:     primary.landing_page_url,
        source:  'publisher',
        type:    'landing',
        label:   primary.source?.display_name || 'Publisher (Open Access)',
        version: 'published',
        rank:    SOURCE_RANK['publisher'] - 0.5,
      });
    }
  }

  // Best OA location (may differ from primary)
  const best = data.best_oa_location;
  if (best) {
    const bestUrl = best.pdf_url || best.landing_page_url;
    const primaryUrl = primary?.pdf_url || primary?.landing_page_url;
    if (bestUrl && bestUrl !== primaryUrl) {
      const sourceType = detectSourceType(best);
      const isPdf = !!best.pdf_url;
      results.push({
        url:     bestUrl,
        source:  sourceType,
        type:    isPdf ? 'pdf' : 'landing',
        label:   best.source?.display_name || labelFromUrl(bestUrl),
        version: best.version || 'unknown',
        rank:    SOURCE_RANK[sourceType] - (isPdf ? 0 : 0.5),
      });
    }
  }

  // All OA locations
  for (const loc of (data.locations || [])) {
    if (!loc.is_oa) continue;
    const locUrl = loc.pdf_url || loc.landing_page_url;
    if (!locUrl) continue;
    if (results.some(r => r.url === locUrl)) continue; // deduplicate

    const sourceType = detectSourceType(loc);
    const isPdf = !!loc.pdf_url;

    results.push({
      url:     locUrl,
      source:  sourceType,
      type:    isPdf ? 'pdf' : 'landing',
      label:   loc.source?.display_name || labelFromUrl(locUrl),
      version: loc.version || 'unknown',
      rank:    SOURCE_RANK[sourceType] - (isPdf ? 0 : 0.5),
      note:    loc.version === 'submittedVersion' ? 'May differ from final version' : null,
    });
  }

  return results;
}

function detectSourceType(loc) {
  const host = (loc.source?.host_organization_name || '').toLowerCase();
  if (host.includes('arxiv') || host.includes('biorxiv') || host.includes('ssrn') || host.includes('medrxiv')) {
    return 'preprint';
  }
  if (loc.source?.type === 'journal' && loc.is_oa) {
    return 'publisher';
  }
  return 'repository';
}

function labelFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    const known = {
      'arxiv.org':       'arXiv',
      'biorxiv.org':     'bioRxiv',
      'medrxiv.org':     'medRxiv',
      'ssrn.com':        'SSRN',
      'ncbi.nlm.nih.gov':'PubMed Central',
      'europepmc.org':   'Europe PMC',
      'zenodo.org':      'Zenodo',
      'hal.archives-ouvertes.fr': 'HAL',
      'core.ac.uk':      'CORE',
      'semanticscholar.org': 'Semantic Scholar',
    };
    return known[host] || host;
  } catch {
    return 'Open Access';
  }
}

function deduplicateAndRank(results) {
  // Deduplicate by URL (ignore query params), keep highest rank
  const seen = new Map();
  for (const r of results) {
    if (!r.url) continue;
    const key = r.url.split('?')[0];
    if (!seen.has(key) || seen.get(key).rank < r.rank) {
      seen.set(key, r);
    }
  }
  return Array.from(seen.values()).sort((a, b) => b.rank - a.rank);
}

// ─── Paper Metadata ──────────────────────────────────────────────────────────

function extractPageTitle() {
  // Try citation_title first (most accurate for papers)
  const meta = document.querySelector('meta[name="citation_title"]');
  if (meta) return meta.getAttribute('content');
  // Fall back to <title> but strip publisher suffix (e.g. " | Elsevier")
  return document.title.split(/[|\-–—]/)[0].trim();
}

function buildPaperMeta(openAlexData, doi) {
  if (!openAlexData) {
    return {
      title:   extractPageTitle(),
      authors: '',
      year:    '',
      journal: '',
      doi,
    };
  }
  const authors = (openAlexData.authorships || [])
    .slice(0, 3)
    .map(a => a.author?.display_name || '')
    .filter(Boolean)
    .join(', ');
  const et_al = (openAlexData.authorships || []).length > 3 ? ' et al.' : '';

  return {
    title:      openAlexData.title || extractPageTitle(),
    authors:    authors + et_al,
    year:       openAlexData.publication_year || '',
    journal:    openAlexData.primary_location?.source?.display_name || '',
    doi,
    citedBy:    openAlexData.cited_by_count || 0,
    openAlexUrl: openAlexData.id,
  };
}

// ─── UI ──────────────────────────────────────────────────────────────────────

function sourceIcon(source, linkType) {
  if (linkType === 'landing') return '🔗';
  const icons = {
    'publisher':  '📄',
    'repository': '🏛',
    'preprint':   '📋',
    'openalex':   '🔍',
  };
  return icons[source] || '🔗';
}

function sourceColor(type) {
  const colors = {
    'publisher':  '#4ade80',
    'repository': '#60a5fa',
    'preprint':   '#f59e0b',
    'openalex':   '#94a3b8',
  };
  return colors[type] || '#94a3b8';
}

function renderPanel(meta, results, state) {
  // Remove existing panel
  document.getElementById(PANEL_ID)?.remove();

  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.setAttribute('role', 'complementary');
  panel.setAttribute('aria-label', 'Aaron — Public Knowledge Unblocker');

  if (state === 'loading') {
    panel.innerHTML = `
      <div class="aaron-header">
        <span class="aaron-logo">◈</span>
        <span class="aaron-title">Aaron</span>
        <button class="aaron-close" aria-label="Close">×</button>
      </div>
      <div class="aaron-loading">
        <div class="aaron-spinner"></div>
        <p>Searching open repositories…</p>
      </div>
    `;
    document.body.appendChild(panel);
    panel.querySelector('.aaron-close').addEventListener('click', dismissPanel);
    return;
  }

  if (state === 'no-doi') {
    panel.innerHTML = `
      <div class="aaron-header">
        <span class="aaron-logo">◈</span>
        <span class="aaron-title">Aaron</span>
        <button class="aaron-close" aria-label="Close">×</button>
      </div>
      <div class="aaron-empty">
        <p>No DOI detected on this page.</p>
        <p class="aaron-sub">Aaron works on pages with a DOI (Digital Object Identifier).</p>
      </div>
    `;
    document.body.appendChild(panel);
    panel.querySelector('.aaron-close').addEventListener('click', dismissPanel);
    return;
  }

  if (state === 'not-found' || results.length === 0) {
    panel.innerHTML = `
      <div class="aaron-header">
        <span class="aaron-logo">◈</span>
        <span class="aaron-title">Aaron</span>
        <button class="aaron-close" aria-label="Close">×</button>
      </div>
      <div class="aaron-meta">
        <p class="aaron-paper-title">${escapeHtml(meta.title)}</p>
        ${meta.authors ? `<p class="aaron-authors">${escapeHtml(meta.authors)}${meta.year ? ` · ${meta.year}` : ''}</p>` : ''}
      </div>
      <div class="aaron-empty">
        <p>No open-access version found.</p>
        <p class="aaron-sub">This paper may not be publicly archived yet.</p>
        ${meta.authors ? `<a class="aaron-request-btn" href="mailto:?subject=Paper%20request%3A%20${encodeURIComponent(meta.title)}&body=Hi%2C%0A%0AI%20am%20writing%20to%20request%20a%20copy%20of%20your%20paper%3A%0A%0A${encodeURIComponent(meta.title)}%0ADOI%3A%20${encodeURIComponent(meta.doi)}%0A%0AThank%20you!" target="_blank">✉ Draft author request email</a>` : ''}
      </div>
      <div class="aaron-footer">DOI: ${escapeHtml(meta.doi)}</div>
    `;
    document.body.appendChild(panel);
    panel.querySelector('.aaron-close').addEventListener('click', dismissPanel);
    return;
  }

  // We have results — render with PDF vs landing page distinction
  const resultItems = results.map(r => {
    const icon = sourceIcon(r.source, r.type);
    const isLanding = r.type === 'landing';
    const cssClass = isLanding ? 'aaron-result aaron-result-landing' : 'aaron-result';
    const label = isLanding
      ? `View on ${escapeHtml(r.label)}`
      : `PDF — ${escapeHtml(r.label)}`;

    return `
      <a class="${cssClass}" href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">
        <span class="aaron-result-icon">${icon}</span>
        <span class="aaron-result-body">
          <span class="aaron-result-label">${label}</span>
          ${r.note ? `<span class="aaron-result-note">${escapeHtml(r.note)}</span>` : ''}
        </span>
        <span class="aaron-result-tag" style="color:${sourceColor(r.source)}">${r.source}</span>
      </a>
    `;
  }).join('');

  panel.innerHTML = `
    <div class="aaron-header">
      <span class="aaron-logo">◈</span>
      <span class="aaron-title">Aaron</span>
      <span class="aaron-badge">${results.length} open version${results.length > 1 ? 's' : ''}</span>
      <button class="aaron-close" aria-label="Close">×</button>
    </div>
    <div class="aaron-meta">
      <p class="aaron-paper-title">${escapeHtml(meta.title)}</p>
      ${meta.authors ? `<p class="aaron-authors">${escapeHtml(meta.authors)}${meta.year ? ` · ${meta.year}` : ''}</p>` : ''}
      ${meta.journal ? `<p class="aaron-journal">${escapeHtml(meta.journal)}</p>` : ''}
    </div>
    <div class="aaron-results">
      ${resultItems}
    </div>
    <div class="aaron-footer">
      DOI: <a href="https://doi.org/${escapeHtml(meta.doi)}" target="_blank">${escapeHtml(meta.doi)}</a>
      ${meta.citedBy ? `· Cited ${meta.citedBy}×` : ''}
      ${meta.openAlexUrl ? `· <a href="${escapeHtml(meta.openAlexUrl)}" target="_blank">OpenAlex</a>` : ''}
    </div>
    <div class="aaron-attribution">
      In memory of Aaron Swartz (1986–2013)
    </div>
  `;

  document.body.appendChild(panel);
  panel.querySelector('.aaron-close').addEventListener('click', dismissPanel);

  // Animate in (double rAF ensures the browser has painted the initial state)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      panel.classList.add('aaron-visible');
    });
  });
}

function dismissPanel() {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;
  panel.classList.remove('aaron-visible');
  panel.classList.add('aaron-hiding');
  setTimeout(() => panel.remove(), 300);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function run() {
  try {
    const doi = extractDOI();

    if (!doi) {
      // Only show panel on doi.org where a DOI was expected but not found
      if (location.hostname === 'doi.org') {
        renderPanel({}, [], 'no-doi');
      }
      return;
    }

    console.log('[Aaron] DOI detected:', doi);

    // Check cache first — instant render, zero network
    const cached = getCached(doi);
    if (cached) {
      console.log('[Aaron] Cache hit');
      renderPanel(cached.meta, cached.results, cached.results.length ? 'found' : 'not-found');
      return;
    }

    // Show loading state immediately so user gets feedback fast
    renderPanel({}, [], 'loading');

    const openAlexData = await queryOpenAlex(doi);
    const meta = buildPaperMeta(openAlexData, doi);
    const results = deduplicateAndRank(parseOpenAlex(openAlexData));

    // Cache for this session
    setCache(doi, { meta, results });

    if (results.length === 0) {
      renderPanel(meta, [], 'not-found');
      return;
    }

    renderPanel(meta, results, 'found');
  } catch (e) {
    console.warn('[Aaron] Error:', e.message);
    // Guard: panel may not exist if extraction threw before renderPanel('loading')
    const panel = document.getElementById(PANEL_ID);
    if (panel) dismissPanel();
  }
}

// ─── SPA Navigation ──────────────────────────────────────────────────────────
// Publisher sites (ScienceDirect, PubMed, etc.) navigate between articles
// via pushState/replaceState without full page reloads. The content script
// only runs once on document_idle, so we watch for URL changes.

let lastUrl = location.href;

const urlObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    document.getElementById(PANEL_ID)?.remove();
    run();
  }
});

urlObserver.observe(document.body, { childList: true, subtree: true });

window.addEventListener('popstate', () => {
  document.getElementById(PANEL_ID)?.remove();
  run();
});

// Initial run
run();
