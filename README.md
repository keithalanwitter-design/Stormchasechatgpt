# StormChase — WHIRL Forecasting Platform v0.8

**GitHub Pages website files are uploaded to the `gh-pages` branch.** Activate publishing in Settings → Pages → Deploy from a branch → gh-pages → / (root) → Save. The public website address will be https://keithalanwitter-design.github.io/Stormchasechatgpt/ . No ChatGPT sign-in is required.
Personal severe-weather forecasting and research prototype. Spring 2027 development target. WHIRL means **Witter–Hart Integrated Rotational Likelihood**. It is experimental, not an official warning or a calibrated tornado probability.

## Quick start

Node.js 22.22.2+ (or 24.15+) is required (Node 22 recommended for CI).

```sh
npm ci
npm test
npm run build
npm run dev
```

Open the Vite URL. No keys or account setup are needed. Pages publishes the selected gh-pages branch after activation. GPS is never requested by the new Forecast Center.

For a browser-openable preview without a server:

```sh
npm run preview:portable
```

Run `npm run check:portable` for the DOM-only standalone smoke check, then open `portable-preview/StormChase-WHIRL-Preview.html`. Geography, map engine and CSS are bundled. WebGL is required for the globe. Companion legacy screens open in new tabs from embedded HTML. Official feeds still need internet and browser CORS permission. Companion pages are also available separately in that folder. A browser without WebGL gets an explanatory fallback; controls and research intake remain usable. This file is a local preview, not a hosted deployment.

## Functional now

- MapLibre globe, drag/zoom, globe/regional projection switch and animated U.S. drill-down. Bundled Natural Earth country and state geography; **coarse geography, no street-level or terrain basemap**.
- Three clickable synthetic U.S. environment polygons and ingredient evidence cards. CAPE, CIN, SRH500, effective shear, LCL and conceptual boundary layer controls with opacity. These are **illustrative regional fills, not computed atmospheric grids**.
- Day 5 through Day 0, 3-hour lead slider and playback. Run and valid times are UTC. All guidance is synthetic. Model catalog caps: GFS 120 h, HRRR 48 h, RAP 21 h, NAM 84 h. These are fixture limits, not a live catalog of operational runs. Long-lead selections fall back to GFS.
- Same-region/time synthetic model comparison. No WHIRL forecast score is calculated or implied on the geographic screen.
- On-demand official NWS active actual alerts and SPC Day 1 categorical GeoJSON. Source, issue, expiry and retrieval timestamps; timeout/error and stale states. Current official geometry has a separate map mode from the May 2027 demo. No time-matched archived SPC comparison yet.
- Historical case intake: validate/import/export JSON, browser-local registry, duplicate-ID rejection, UTC checks, label/coverage requirements and elementary pre-onset input checks. Starts empty, with no invented confirmed outcomes. Export format can be reimported.
- Existing v0.5 Field Command, parameter guide and synthetic WHIRL scoring lab retained.

## Not yet functional

Real HRRR/RAP/GFS ingestion, soundings/hodographs, raster/grid tiles, fitted WHIRL calculations, real forecast hotspots, calibrated uncertainty, national historical case database, replay, live storm objects, velocity/dual-pol processing, route analysis and shared field observations. Geographic coverage outside the U.S. is unvalidated. The existing Field Command uses third-party RainViewer reflectivity and approximate alert centroid pins; its earlier limitations still apply.

## Verification

The imported v0.5 source built and passed its three existing tests before modification. v0.6 adds scientific/data and DOM interaction smoke tests. DOM tests mock MapLibre, so **they do not validate WebGL rendering, projection appearance, animation, visual layout or device behavior**. There is no browser-control capability available in the development environment; manual desktop/Android QA remains a release requirement.

Direct official-endpoint checks on October 10, 2026 returned valid SPC and NWS GeoJSON, normalized successfully. These are request-time observations, not a claim of permanent availability or browser CORS verification. Fresh data is requested on demand; no captured weather is packaged as live.

GitHub Actions runs `npm ci`, tests, build and portable-preview generation. A bundle-size warning is expected for MapLibre. No operational reliability or scientific skill has been established.

## Version control / GitHub

Source and automated checks: https://github.com/keithalanwitter-design/Stormchasechatgpt . The built website is on the `gh-pages` branch, with asset paths configured for this repository. The earlier downloadable source checkpoint retains pre-upload local Git history.

See [architecture and backlog](docs/ARCHITECTURE_BACKLOG.md), [audit](docs/AUDIT.md), and [data provenance](docs/DATA_PROVENANCE.md).

Final checkpoint: **15/15 tests passed**, production build passed, standalone preview/fallback DOM check passed. Visual WebGL/mobile review remains pending.

## Research foundation v0.7

See [research/README.md](research/README.md) for the versioned PostGIS schema, guarded DuckDB/Parquet mart, archive-selection utilities and SI wind features. This offline package is not connected to the browser registry or forecast overlays. No proposed WHIRL weighting or probability calibration is implemented.

## Live Setup Studio v0.8

The default observatory opens in live point mode with Belleville, IL as its sample location. Click the map, search a listed city/coordinates, or choose a quick point. The six-day NOAA GFS/HRRR seamless point feed is delivered by Open-Meteo; it is real model output, not observations, an official NWS forecast, or a single identified run. The independent official NWS hourly point forecast appears beside it when coverage is available. Current SPC/NWS geometry retains independent issuance/expiry times.

Move the real timeline to inspect model CAPE, CIN magnitude, 2 m dew point, temperature, 10 m winds, cloud cover and precipitation. Slider changes create a what-if scenario and preserve a displayed real baseline. SRH500, effective shear and mixed-layer LCL remain blank until manually assumed. Fingerprint spokes are slider display ranges, not tornado probabilities; missing spokes are omitted. Pin a comparison, export/import a hypothesis JSON for a friend, choose Orbit/Ion/Ember themes, or enter focus view. Importing a historical scenario does not turn it into current guidance.

Browser requests have cancellation/timeout and visible errors. Model and NWS baselines age out after one hour and need manual refresh. NWS current map feeds retain their five-minute policy. No API keys are required for this personal prototype. Open-Meteo attribution is visible; review its terms/usage limits before public or commercial expansion. Direct browser requests are a prototype: a cached server adapter remains next work. The published website retains these experimental labels.

API references: https://open-meteo.com/en/docs/gfs-api and https://www.weather.gov/documentation/services-web-api . These point APIs are a quick path to useful interactivity. The sounding processor is still needed for full low-level wind diagnostics and scientifically reproducible model comparison.

## GitHub review

Repository: https://github.com/keithalanwitter-design/Stormchasechatgpt . Source visibility is public. Live preview: https://keithalanwitter-design.github.io/Stormchasechatgpt/ . Built files are published from `gh-pages` at the repository root; no viewer login is required.

To see the app without development tools: open the latest successful **Verify StormChase** run under **Actions**, download the `stormchase-preview` artifact, extract it, and open `StormChase-WHIRL-Preview.html` in a browser with internet and WebGL. Downloading Actions artifacts may require signing in. For the best supported experience, clone this repository and use the quick-start commands above.

Use **Issues → New issue → Preview feedback** to record your device, selected location/time, screenshots and the behavior you expected. GitHub Pages is enabled on the `gh-pages` branch from `/ (root)`. The earlier source archive includes the pre-upload local Git history.

## Browser location & layer guidance v0.9

Use **Use my location** in the Forecast Center on HTTPS desktop or mobile browsers. It requests a single device fix only after a click, defaults to a quick estimate, and offers optional higher accuracy. The browser chooses GPS/Wi-Fi/cell/network signals; the app cannot identify the source. Reported device accuracy and capture time are shown separately from forecast uncertainty. Coordinates are rounded to 0.01 degrees before Open-Meteo/NWS requests; no raw fix, watch, location history or app-side location persistence is used. The user-facing explanation identifies these providers and warns that exported scenarios include their selected point. Existing city/coordinate entry remains available. Cancellation or a manual point change invalidates late location callbacks. Permission denial, timeouts, unsupported devices and insecure contexts have actionable fallback text. Imported scenarios contain user-provided metadata, not a new device fix.

Overlays include concise plain-language descriptions plus expandable combined guidance. Simulated layer checkboxes and opacity are disabled outside Demo mode; official context is requested independently. The Setup Studio adds calculated model temperature-minus-dew-point spread with a concise guide to moisture, wind direction, cloud and rain. No new tornado thresholds or fitted WHIRL score are introduced.

Verification: 24 JavaScript tests including mocked location permission/error/cancellation/privacy guards; production and portable builds. Actual phone/desktop device fixes and permissions require user-device QA. Cloud browser lacks WebGL; geographic rendering remains to verify on a capable device.

## Observatory v0.10

The main forecast is now a wide globe scene with a floating point card, a collapsed Layers drawer, expandable region shortcuts and compact timeline. The Setup Studio adds bounded one-click moisture/cap scenario experiments and expandable ingredient explanations. Location search/GPS remains collapsed below the studio. These changes preserve the existing live/demo/official separation.

WebGL-capable browsers retain MapLibre. If WebGL initialization fails, a bundled D3 orthographic SVG globe supports drag/keyboard rotation, coordinate selection, regional projection, simulated regions and current official geometry. It uses the same Natural Earth geography; it is a geographic renderer, not satellite imagery or an atmospheric grid. The SVG demo renderer uses a common simulated footprint and does not distinguish every layer style. The full layer rendering remains in MapLibre.

Verification: 26 JavaScript tests, production build, portable no-WebGL smoke check. Browser visual review verifies the SVG fallback; GPU rendering and actual mobile touch behavior require device QA. Next priorities remain actual gridded overlays, native-level soundings, identified model runs and case replay.

### Live map layers (October 2026)
Open **Layers** on the forecast globe: radar precipitation, NWS radar locations, SPC Day 1 categorical outlook and active NWS alert polygons have independent switches. Radar switches to the regional map; its observed-frame slider and loop are independent of the forecast timeline. Radar is RainViewer's recent precipitation mosaic (zoom detail capped at 7), not individual-site Level II or velocity. NWS station markers use the official `/radar/stations` catalog and link to station products; receipt timestamps are not the mosaic frame time. SPC and NWS remain official current-time products. Alerts without geometry stay in the alert list; boundaries are never invented. Enabled feeds refresh every four minutes while visible; failures display unavailable status. Attribution and observation/check times are displayed. SVG regional fallback uses geographically placed real radar tiles; the globe fallback shows vector stations/outlooks/alerts. Provider availability and blank tiles do not establish an all-clear.

Next priorities: NOAA MRMS direct imagery with frame metadata; individual-site reflectivity/velocity and quality controls; SPC Days 2–3 and probabilistic products; radar coverage/outage masks; phone touch and GPU testing.

The default Chase theme uses charcoal, storm amber and strong sans-serif type. The front page emphasizes radar, severe-weather ingredients and chase planning; decorative observatory language has been removed. Ion and Ember themes remain selectable. Operational SPC/radar colors retain their existing meaning.

Chase workflow refinement: top Hotspots directs to the bottom Field guide; the explicitly simulated hotspot demo is launched there. The guide includes Scout / Verify / Test / Adapt steps, six expandable FAQs, a return-to-live action and a collapsed simulated model comparison. Current weather remains the initial mode. Stronger type and amber/orange accents carry the Chase theme without claiming an active outbreak or forecast certainty.

### Page navigation and map gestures
Normal wheel/trackpad scrolling and one-finger browsing continue down the page. Map movement is opt-in through **Move map**, with **Done moving** or Escape to exit. Wheel zoom stays disabled in both modes; WebGL zoom buttons remain available. The SVG fallback follows the same movement mode and ignores browse-mode swipes. A sticky section bar links Map, Timeline, Setup Studio, Outlooks & alerts and Field guide; a hero continuation link makes the content below explicit. Phone hardware gestures still need device QA.

### Data service foundation
`src/data-services.js` defines a shared product catalog for raster radar, station points and official polygons, with provider URL, product type, independent time domain, TTL and timeout. Radar/station and SPC/NWS adapters use this service. It coalesces simultaneous requests, supports optional in-memory caching, isolates returned snapshots and rejects failed refreshes instead of relabeling stale cache entries as fresh. Active refresh paths force revalidation. Product-specific normalization still owns source issue/expiry and frame timestamps. This runs in the browser on GitHub Pages; it is not a deployed server backend or operational WHIRL calculation service.

Priorities: device testing; renderer/layer capability adapters; server ingestion and tile service for MRMS and model grids with source-valid times; persistent historical catalogs and leakage-safe feature extraction. New guidance must be explicitly added and validated in the product catalog before use.
