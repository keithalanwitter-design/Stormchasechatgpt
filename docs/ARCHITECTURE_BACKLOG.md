# Architecture and prioritized backlog

## Current implementation

Vite + existing JavaScript modules + MapLibre GL JS. Preserve the v0.5 field and scoring pages rather than perform a framework migration in the same change. React/TypeScript remains a proposed future refactor after interfaces and data contracts stabilize.

`src/forecast.js` owns UI state and geographic rendering. `forecast-data.js` owns independent synthetic fixtures, lead availability, UTC valid-time calculation, coordinate search and case intake guards. `feeds.js` owns official endpoint requests, normalization and source times. `src/geography` contains bundled Natural Earth vector context. The local registry has no backend, authentication or cross-device synchronization.

Demo forecast and current official data use separate map modes. Switching scope suppresses the other geometry, preventing a current outlook from appearing time-matched to a simulated future run. Official data expires or becomes stale five minutes after retrieval and is hidden until refreshed. Null alert geometries remain in the alert list. WHIRL geography never represents an observed tornado path.

Future runtime: Cloudflare Pages for static assets; a Worker for identified, cached official-feed requests and provenance; R2 for grids/tiles and radar objects; a separate Python xarray/MetPy/cfgrib processing service for meteorology; Postgres/PostGIS or a reviewed spatial alternative for cases. Heavy GRIB/radar processing does not belong in browser code or lightweight Workers. Secrets remain server-side. GPS and field photos require explicit privacy controls before backend upload.

## P0 — complete next (October–November 2026)

1. Verify CI and preview-artifact access in the public Stormchasechatgpt source repository. Website hosting remains disabled.
2. Manually test globe/projection transitions, WebGL failure, mobile layout, keyboard controls and browser feed CORS on Android and desktop. Check preview companion-page navigation.
3. Add official-feed caching/identification with a server-side User-Agent and correct cache expiry. Test outage, CORS, null geometry, pagination/truncation, cancelled alerts and malformed features. Direct browser fetching is prototype-only.
4. Add an actual geocoding provider and higher-resolution regional vector tiles after terms/access review. Current search covers eight named cities plus valid latitude/longitude pairs.
5. Execute the new v0.7 versioned case and availability schema on PostGIS and enforce database roles. Current intake checks are scaffolding, not scientific verification. Include source revision, radar geometry, pre/post onset and label review status.

## P1 — build defensible research data (November–December 2026)

6. Pilot 10–20 actual tornado cases across discrete, QLCS and HSLC contexts, with matched controls backed by observation coverage. Reconcile SPC actual tracks against NCEI; DAT is supplemental geometry.
7. Preserve outbreak-day identifiers; split complete days/events and later periods before fitting weights. Never randomly split scans from one storm across train and test.
8. Ingest archived HRRR/RAP runs, initialization/availability/valid time and lead. Extract upstream profiles with spatial-representativeness flags and stable units.
9. Retain radiosonde and METAR observation quality, inflow direction, distance, rain/outflow contamination and data age. Missing does not mean zero.
10. Add archived SPC outlooks tied to the same case/run/valid time. Only then add meaningful WHIRL/SPC comparison and replay.

## P2 — calculate and evaluate (January–February 2027)

11. Implement reproducible MLCAPE/MLCIN/MLLCL, SRH500/SRH1/effective SRH, effective shear and storm-motion assumptions. Handle missing effective layers explicitly.
12. Publish provenance-bearing environmental tiles, no invented continuous grids. Display model-run availability and range accurately.
13. Test alternative WHIRL families; compare with STP/SCP/climatology and ingredient ablations. Do not double count correlated kinematics. Draft normalizers, weights, mode multipliers, cap gates and chase thresholds are hypotheses.
14. Report held-out discrimination, calibration only when probability is actually modeled, false alarms, uncertainty and HSLC/QLCS stratification. A small pilot is not adequate validation.

## P3 — field trials (March–June 2027)

15. Log prospective forecasts before outcomes. Keep forecast revisions and release/model versions; never backfill post-event analysis as forecast input.
16. NEXRAD Level II/benchmark radar pipeline; track scan/sweep, range, beam height, blockage, era and input availability. Debris evidence remains post-onset confirmation.
17. Opt-in GPS, local field observations and privacy-reviewed sharing. No precise intercept/arrival instruction without a separately reviewed hazard-aware system.
18. Review feed and map licensing, accessibility, performance, scientific claims and observation bias before any public expansion. Public release requires explicit user instruction.

## Acceptance limits for this checkpoint

M1 baseline build/audit: complete. M2 interactive shell/fixtures: implemented; browser visual QA pending. M3 on-demand adapters: implemented and direct endpoint checks passed; runtime browser reliability pending. M4 case intake scaffold only. M5–M7 remain backlog. No trained model, prediction skill, real atmospheric field or confirmed case database is claimed.

## v0.7 research checkpoint

Added separate label/input/case schemas, many-to-many associations, availability guards, Parquet/DuckDB analytics and competing low/deep wind features. Research foundations are offline and tested with fixtures; the browser registry remains independent. PostGIS runtime verification, HRRR extraction, real radar decode and scientific calibration are outstanding. See `research/README.md` for definitions and reviewed source corrections.

## v0.8 observatory checkpoint

Implemented premium theme/focus controls and live point setup experiments, with NOAA seamless guidance via Open-Meteo and independent official NWS hourly forecasts. The point forecast has real valid times and provider grid coordinates, but no single model-run initialization. Manual scenarios never change official geometries or create tornado hotspots.

Next priorities: browser/WebGL/mobile verification; cached API adapter with rate control and provider attribution; broader location search; independent HRRR/GFS run selection; native-level soundings for SRH/shear/LCL; radar/observations to assess boundaries and initiation; then reviewed case replay. Full gridded overlays and WHIRL probabilities remain unimplemented.
