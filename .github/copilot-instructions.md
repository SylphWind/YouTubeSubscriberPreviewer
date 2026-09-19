# Copilot instructions

## Project overview

This repository is a dependency-free Chrome Manifest V3 extension that previews
YouTube channel subscriber counts when the pointer rests on a channel link.
The extension is loaded directly as an unpacked extension; there is no
bundler, package manager, server, or generated output.

The runtime flow is:

1. `content.js` uses document-level `mouseover`/`mouseout` delegation so it
   continues to work with YouTube's SPA-rendered DOM. It recognizes channel
   handles (`/@...`) and channel IDs (`/channel/UC...`), waits 300 ms, and
   displays the tooltip.
2. `content.js` sends `getSubscriberCount` messages to the background service
   worker and updates the tooltip only if the pointer is still over the
   original link.
3. `background.js` checks `chrome.storage.local` first. Entries are keyed by
   the extracted identifier and cache all returned channel fields. Subscriber
   data is refreshed after seven days, video/view counts after 30 days, while
   region and creation date do not expire. A stale cache miss calls the
   YouTube Data API v3 and updates the cached channel statistics.
4. `styles.css` owns the fixed-position tooltip, viewport placement visual
   treatment, and show animation. `manifest.json` wires the content script,
   stylesheet, service worker, storage permission, and YouTube/Google API host
   permissions.

## Commands and validation

There are no automated build, test, lint, or package-manager commands in this
repository. Do not add commands that assume npm or another toolchain.

To validate a change manually:

1. In `background.js`, configure a restricted YouTube Data API v3 key as
   described in `README.md`.
2. Open `chrome://extensions/`, enable Developer mode, choose **Load
   unpacked**, and select the repository directory.
3. Open or reload a YouTube page, hover a channel handle or `/channel/UC...`
   link for at least 300 ms, and check the tooltip and browser extension
   service-worker console for errors.
4. Hover the same channel again within seven days to verify the `(快取)` path.

There is no single-test command because no test runner or test files exist.

## Repository-specific conventions

- Keep the implementation as plain browser JavaScript and CSS. Avoid adding a
  framework, transpilation, or dependency unless the project is intentionally
  restructured.
- Preserve the Manifest V3 message boundary: content-script UI work belongs in
  `content.js`; API calls and `chrome.storage.local` access belong in
  `background.js`.
- Keep message handlers asynchronous by returning `true` from
  `chrome.runtime.onMessage` listeners before calling `sendResponse`.
- Preserve support for both identifier forms and use `URL` plus pathname
  matching when parsing YouTube links. YouTube is an SPA, so prefer delegated
  document events over one-time scans of the DOM.
- Keep the 300 ms hover debounce, stale-target guard, seven-day cache policy,
  `country`, `videoCount`, `viewCount`, `publishedAt`, and `fromCache` response
  fields and their cache timestamps consistent with the user-visible behavior
  described in `README.md`.
  Subscriber data expires after seven days; video and view counts expire after
  30 days; country and published date do not expire.
  Channel metadata is obtained from the YouTube API `snippet` and `statistics`
  fields and may be absent or hidden; represent unavailable values as
  `未公開` in the tooltip. Older cache entries without the complete data set
  must be refreshed.
- User-facing text and existing inline documentation are in Traditional
  Chinese (`zh-TW`). Keep new visible strings consistent with that language
  and use `Intl.NumberFormat("zh-TW", { notation: "compact" })` for subscriber
  count formatting.
- Use the existing `yt-sub-preview-` CSS class prefix and keep the tooltip
  non-interactive (`pointer-events: none`) so it cannot interfere with hover
  detection.
- The API key is currently configured in `background.js` and is exposed in the
  extension bundle. Never log or publish an unrestricted key; follow the
  README guidance to restrict it to the YouTube Data API and appropriate
  deployment referrers/restrictions.
- When changing host access, storage, or script wiring, update `manifest.json`
  and the corresponding installation or API notes in `README.md`.
