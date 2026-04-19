# Bugs & Iterations — Public Knowledge Unblocker

## 2026-04-07 — Final strict cleanup (v1.0.15)

### Fix: Unused lib/ directory re-accumulated after sync
- **Problem:** `sync-shared-lib.sh` re-populated `lib/` with 11 JS/CSS files + fonts, none referenced by any HTML (content-script-only extension)
- **Root cause:** Sync script doesn't skip content-script-only extensions
- **Fix:** Removed entire `lib/` directory again, bumped version to 1.0.15

### Fix: ls-check false positives for content-script-only extensions
- **Problem:** BRAND-GRADIENT and BRAND-THEME checks failed because no HTML files exist — these checks assume popup/settings pages
- **Root cause:** Checks didn't account for content-script-only extensions that inject into host pages
- **Fix:** Added early-return N/A path in `check_brand_gradient()` and `check_brand_theme()` when `html_files` is empty

## 2026-04-06 — Strict check fixes (v1.0.13)

### Bug: innerHTML usage flagged as security risk
- **Problem:** `renderPanel()` used `innerHTML` for all 4 panel states despite `escapeHtml()` sanitization
- **Root cause:** `innerHTML` is inherently risky in content scripts injected into third-party pages
- **Fix:** Replaced all `innerHTML` with DOM API (`createElement`/`textContent`/`appendChild`), removed `escapeHtml()`

### Bug: Low text opacity fails beige theme contrast
- **Problem:** `.aaron-result-landing` used `opacity: 0.7` and `.aaron-result-note` used `opacity: 0.8`, reducing effective contrast below WCAG thresholds
- **Root cause:** Using element-level opacity instead of direct color values
- **Fix:** Replaced opacity with explicit color values (#969696, #999, #c98d09) that maintain visual hierarchy without contrast loss

### Cleanup: Dead lib files removed
- **Problem:** 12 shared lib files synced to `lib/` but never referenced (no popup.html in this content-script-only extension)
- **Fix:** Removed entire `lib/` directory — this extension only uses `content.js` and `panel.css`

### Cleanup: Missing LICENSE and BUGS_AND_ITERATIONS.md
- **Fix:** Added MIT LICENSE and this file
