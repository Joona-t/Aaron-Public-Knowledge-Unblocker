# Aaron — Public Knowledge Unblocker

> *"Information is power. But like all power, there are those who want to keep it for themselves."*
> — Aaron Swartz, Guerilla Open Access Manifesto, 2008

A browser extension that finds legal, open-access versions of paywalled research papers — automatically, silently, and without any data collection.

Built in memory of **Aaron Swartz (1986–2013)**: programmer, activist, co-creator of RSS, builder of the web.

---

## What it does

When you land on a paywalled research article, Aaron:

1. Extracts the DOI (Digital Object Identifier) from page metadata
2. Queries **OpenAlex** — a free, open academic metadata API (CC0 licensed)
3. Returns all legal open-access versions found across:
   - Publisher open-access copies (gold OA)
   - Institutional repositories
   - arXiv, bioRxiv, medRxiv preprints
   - PubMed Central, Europe PMC
   - Zenodo, CORE, and other archives
4. Displays a non-intrusive panel with ranked links
5. Falls back to a "draft author request email" if nothing is found (legally requesting a copy from the author is always permitted)

Results are cached per session — revisiting the same paper is instant with zero network requests.

---

## What it does NOT do

- Bypass paywalls or access restricted content
- Scrape, intercept, or modify publisher pages
- Collect, store, or transmit any data about you
- Use Sci-Hub or any gray/illegal source
- Require an account, API key, or backend server

All queries go directly from your browser to the OpenAlex API. This extension has **zero permissions** beyond `host_permissions` for the single API domain it calls.

---

## Supported publishers

Elsevier / ScienceDirect · Springer · Nature · Wiley · JSTOR · IEEE Xplore · ACM DL · Oxford University Press · SAGE · Cell Press · The Lancet · BMJ · NEJM · PNAS · Science · University of Chicago Press · Karger · De Gruyter

SPA navigation is handled — browsing between articles on these sites without page reloads works correctly.

---

## Powered by open infrastructure

- [OpenAlex](https://openalex.org/) — open catalog of 250M+ scholarly works, built on Crossref, Unpaywall, MAG, ORCID, and ROR data. CC0 licensed, free, non-commercial.

---

## Installation (development)

```bash
git clone https://github.com/Joona-t/aaron-public-knowledge-unblocker
cd aaron-public-knowledge-unblocker

# Generate icons (requires Pillow)
pip install Pillow
python3 generate_icons.py

# Load in Chrome
# chrome://extensions → Enable Developer Mode → Load Unpacked → select this folder

# Load in Firefox
# about:debugging#/runtime/this-firefox → Load Temporary Add-on → select manifest.json
```

## Building for store submission

```bash
chmod +x build.sh
./build.sh
```

Produces `aaron-chrome.zip` and `aaron-firefox.zip`.

---

## License

MIT. Use it, fork it, improve it. Put it everywhere.

---

## On Aaron

Aaron Swartz was 26 when he died. He had already:

- Co-authored the RSS 1.0 specification at age 14
- Co-founded Reddit
- Built web.py
- Co-founded Demand Progress, which helped defeat SOPA
- Written the Guerilla Open Access Manifesto
- Built DeadDrop (later SecureDrop), which protects whistleblowers worldwide

He was being prosecuted under the Computer Fraud and Abuse Act for downloading academic papers from JSTOR — papers he believed should be freely available to everyone on earth, not just those at elite institutions.

The federal government sought 35 years in prison and $1 million in fines.

JSTOR dropped the civil case. The government did not.

This extension is a small, legal continuation of what he believed: that knowledge belongs to everyone.

---

*Part of the [LoveSpark](https://github.com/joona-t) open-source ecosystem.*
*No ads. No tracking. No data collection. MIT licensed.*
