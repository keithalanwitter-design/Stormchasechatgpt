# StormChase Forecasting Architecture (Spring 2027 target)

## Mission
Research-first tornado forecasting workstation. Separate environmental favorability from storm occurrence, tornado probability, and EF intensity. No model can reliably pinpoint violent tornadoes in advance.

## Forecast horizons
- Days 2–7: synoptic and ensemble agreement (GEFS/ECMWF ensembles where licensed), jet dynamics, moisture return, boundaries, timing.
- Day 1 / 0–12h: RAP/HRRR forecasts and observed mesoanalysis; initiation, cap, storm mode, 0–1 km SRH, 0–500 m SRH where available, LCL, 0–6 km shear, low-level lapse rates, buoyancy, moisture depth.
- 0–90 min: radar storm tracking and trends, 0.5-degree reflectivity, velocity, spectrum width, dual-pol CC/ZDR, storm interactions, boundary crossings. Radar beam height and range limitations must be explicit.

## Layers
1. Observations: METAR/mesonet surface plots, fronts/outflow boundaries, radar, GOES visible/IR, lightning, LSR.
2. Forecast fields: model/time/validity metadata; CAPE (ML/MU/SB), MLCIN, 0–6 km shear, 0–1 km SRH, effective SRH, STP (effective/fixed), SCP, LCL, 0–3 km CAPE, 0–500 m shear/SRH if computed.
3. Uncertainty: ensemble percentile/spread, observation age, model run age, boundary position uncertainty, storm-mode confidence.
4. Verification: historical NOAA Storm Data/LSRs, warnings, radar archives; no training on reports that postdate forecast issue time.

## Architecture
- Frontend: Vite/JS + MapLibre (existing MVP), modularize into `src/features/forecast` and map-layer registry.
- Backend: Cloudflare Worker for caching/normalizing lightweight NWS/SPC/METAR feeds; separate Python scientific pipeline for GRIB2/NetCDF/NEXRAD processing and heavy computations.
- Storage: object storage for forecast grids/tiles; relational metadata for runs, provenance, verification, and versioned forecast snapshots.
- Forecast API (planned): `/api/v1/layers`, `/api/v1/fields?valid=...`, `/api/v1/soundings?lat=...&lon=...`, `/api/v1/targets?run=...`, `/api/v1/verification`.
- Every field includes source, issue/valid time, spatial resolution, units, latency and stale status. Never silently replace missing data with zero.

## Tornado targeting engine (research roadmap)
- Stage 1: physically interpretable multi-parameter diagnostic panels; not a numeric tornado-probability model.
- Stage 2: boundary-relative environmental corridors, initiation probability and discrete-storm opportunity, with separate hazard categories.
- Stage 3: calibrated probabilistic model trained on historical reanalysis/forecast snapshots and tornado reports; spatial/temporal out-of-sample validation, reliability curves, false alarm rates, Brier score, precision/recall, and severe-event lead times.
- Stage 4: storm-scale nowcast based on radar object tracking and trends, with strict separation of observations and forecasts.

## Guardrails
- STP and other composite indices are environmental proxies, not a direct EF4/EF5 prediction.
- Distinguish significant tornado (EF2+) potential from violent tornado (EF4+) potential. Avoid numerical violent tornado probabilities until independently validated.
- No precise intercept routing or guarantees of safe storm access. Official NWS watches/warnings supersede app output.
- Keep field-photo identification explicitly uncertain without time series and velocity corroboration.

## Planned milestones
1. Forecast laboratory UI, glossary, layer/time selectors, forecast-vs-observation toggle.
2. Real observational surface station overlays and official alert polygons.
3. HRRR/RAP model fields and time slider with documented licenses/costs.
4. Forecast soundings, hodographs, derived parameters, and boundary diagnostics.
5. Archive/replay with June 17 2026 Illinois case and other historical outbreaks.
6. Verified probabilistic research model and mobile field mode.
