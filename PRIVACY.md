# Privacy Policy — Aaron: Public Knowledge Unblocker

**Last updated:** February 24, 2026

## Summary

Aaron does not collect, store, or transmit any personal data. Period.

## What data Aaron accesses

When you visit a supported academic publisher website, Aaron reads the page's HTML meta tags to extract the article's DOI (Digital Object Identifier). This is public metadata embedded in the page by the publisher.

## What data Aaron sends

Aaron sends the extracted DOI to the OpenAlex API (https://api.openalex.org) to look up whether a legal open-access version of the paper exists. This is the only network request the extension makes.

- The request contains only the DOI (e.g., `10.1038/s41586-023-06600-9`)
- No cookies, tokens, user identifiers, or browser information are sent
- No IP address is logged by Aaron (OpenAlex's own privacy policy governs their server logs)

## What data Aaron stores

Aaron uses your browser's `sessionStorage` to cache API results within a single tab session. This cache:

- Contains only paper metadata and open-access links returned by OpenAlex
- Is automatically deleted when you close the tab
- Is never shared, synced, or transmitted anywhere
- Contains no personal information

Aaron does not use `localStorage`, `chrome.storage`, cookies, or any persistent storage mechanism.

## What data Aaron does NOT access

- Browsing history
- Bookmarks
- Passwords or autofill data
- Other tabs or windows
- File system
- Camera, microphone, or location
- Any personal information whatsoever

## Permissions

Aaron requests one permission:

- **host_permissions for api.openalex.org**: Required to query the OpenAlex API for open-access paper data. This is the only external service Aaron communicates with.

Aaron requests no other permissions. It cannot read your tabs, access your browsing history, or modify any website content beyond injecting its own UI panel.

## Third-party services

- **OpenAlex** (https://openalex.org): A free, open scholarly metadata catalog. CC0 licensed. Operated by OurResearch, a nonprofit. Their privacy policy: https://openalex.org/privacy

## Children's privacy

Aaron does not collect any data from any user of any age.

## Changes to this policy

Any changes will be posted to this page and reflected in the extension's store listing.

## Contact

For questions about this privacy policy: https://github.com/Joona-t/aaron-public-knowledge-unblocker/issues

## Open source

Aaron is MIT licensed. The complete source code is available at: https://github.com/Joona-t/aaron-public-knowledge-unblocker
