# StormChase: Two-Mode Forecasting Architecture

## Mission
Forecast regional significant-tornado potential from Day 5 through Day 0, then transition to observation-based live storm assessment and safe field awareness. Explicitly separate environmental favorability, storm-specific rotation evidence, and verified tornado occurrence. Never present experimental scores as official forecasts.

## Mode 1 — Forecast Center (D5 to D0)
- D5–D3: synoptic pattern, ensemble spread, moisture return, deep-layer shear, conditional severe potential; broad target polygons.
- D2–D1: model comparison, CAM guidance when in range, warm fronts/drylines/triple points, CI probability, capping, low-level shear, storm mode, temporal windows.
- D0 pre-initiation: METAR/mesonet, observed soundings, satellite, SPC outlooks/MCDs, boundary analysis, HRRR/RAP error tracking, time-stamped target revisions.
- Overlay layers: MLCAPE, MLCIN, 0–3 km CAPE, LCL, 0–500 m and 0–1 km SRH, effective bulk shear, STP, SCP, theta-e, convergence, 850/700/500 mb fields, forecast soundings and hodographs.
- Show provenance, issue time, valid time, units, model resolution, data age and disagreement on each layer.

## Mode 2 — Live Chase Center
- Ingest official NWS alerts, SPC watches/MCDs, LSRs, NEXRAD Level II/III and derived storm tracks, GOES, METAR, road information.
- Track cell identities and trends across scans; distinguish discrete supercell vs cluster/QLCS; assess inflow notch, bounded weak echo region, reflectivity hooks, velocity couplets, spectrum width and dual-pol debris signatures with appropriate uncertainty.
- Field GPS and optional compass/heading, camera image/video, user-noted wind shift, temperature, dewpoint and pressure; attach all to a timestamped geospatial event.
- Compute storm-relative geometry and conservative hazard windows. Prioritize warning polygons, avoiding hail cores, flooded roads, poor visibility and escape-route loss; do not route users toward tornado circulation.
- All AI image interpretations are tentative; still photos cannot prove rotation or tornado presence.

## Shared services
- Data connectors and cache; normalized spatiotemporal observation schema; geospatial layer registry; target/cell history; forecast revision log; confidence and uncertainty engine; historical replay and verification.
- Store observed, modeled, inferred and officially reported information separately.
- Suggested stack: TypeScript React PWA + MapLibre; Cloudflare Pages/Workers for UI and light API; Python radar/model processing worker; PostGIS/object storage for geospatial archive; feature flags for future multi-user access.

## Validation
- Hindcast multiple event types and null cases with data frozen at issuance time to avoid hindsight leakage.
- Verify broad corridor forecasts with reliability/Brier scores and spatial displacement; storm object tracks with continuity and false alarm/miss statistics; arrival estimates with error bands.
- Never call a composite score a tornado probability until it is statistically calibrated and independently evaluated.

## Milestones to spring 2027
1. Data provenance + forecast map and SPC comparison.
2. Sounding/hodograph explorer and multi-model time slider.
3. Boundary/target corridor tracker and forecast revision log.
4. Radar cell tracking, warning/LSR ingestion and GPS awareness.
5. Field observations, historical replay, validation and reliability tests.
6. Private beta, connectivity and safety testing before any public expansion.

## Data source candidates
NWS API, SPC outlook/watch/MCD products, NOAA NEXRAD archive and real-time feeds, GOES, Aviation Weather Center METARs, NOAA NOMADS/model datasets, Iowa Environmental Mesonet archives. Confirm licensing, rate limits, refresh rates and retention for each connector before production use.
