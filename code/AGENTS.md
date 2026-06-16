# Project Instructions

- When modifying functionality, first update the corresponding documentation under `E:\000\doc\MM\doc`, then update the code.
- Many project files contain Chinese text and should be treated as UTF-8. When reading files in PowerShell, use `-Encoding UTF8` or another explicit UTF-8-safe method before judging text content. If terminal output looks garbled, assume the display encoding may be wrong and confirm the file bytes/content as UTF-8 before editing, so Chinese text is not corrupted by a read/write round trip.
- The home-inventory app commonly previews on `http://127.0.0.1:1420/`. Before starting another dev server, first check whether that URL is already reachable in the browser or via a simple request. If the user can open the page, reuse the existing server for verification instead of repeatedly launching `pnpm dev`.
