# WHIRL research foundation v0.7

This offline research package is independent of the forecast browser. It does not calculate a calibrated WHIRL score, fetch HRRR profiles, issue warnings, or turn the website's synthetic overlays into real forecasts.

## Run

Python 3.12:

```sh
python -m venv .venv
. .venv/bin/activate
pip install -r research/requirements.txt
PYTHONPATH=research python -m unittest discover -s research/tests -v
```

Apply `sql/001_research_schema.sql` once to a new PostgreSQL database with PostGIS installed, then `sql/002_guarded_mart.sql`. SQL syntax is tested; execution on a real PostGIS server is still required before use. The database privileges must enforce labels/predictors separation in production; schemas alone are not an access-control boundary.

For DuckDB, export seven tables to `whirl_labels`, `whirl_inputs`, and `whirl_cases` subdirectories, using each table name plus `.parquet`. `whirl_research.analytics.connect_parquet(directory)` loads them and builds the guarded mart. `predictor_records(connection)` returns separate `X`, `y`, group and split fields. Only allowlisted physical predictors enter X. NULL stays missing; no imputation or fitting occurs. Reanalysis and retrospective label-anchored studies are excluded from the default prospective dataset. Mixed diagnostic/source/motion/label versions and outbreak groups crossing splits are rejected.

## Data contract

- Source revisions and internal reconciled event IDs distinguish updated labels from new events. Preserve raw provider flags; the supplied interpretation of SPC `fc=1` has not been verified.
- Touchdown is a source-reported point. Never infer it from the first vertex of a damage polygon or unordered multipart track. F and EF scales remain separate.
- Profiles preserve initialization, valid time, lead, observation end, historical operational availability, evidence, retrieval, raw URI/hash and QC. Archive retrieval time is not historical availability.
- Features preserve algorithm, parcel definition, SI units and storm-motion provenance. Deterministic recomputation after the event is allowed only from inputs available at the declared prediction cutoff. Observed storm motion measured later cannot enter a pre-onset sample.
- Radar eligibility uses the full volume end and documented availability, not just the filename's start time. Unknown availability fails closed. Dual polarization and super-resolution are nullable until inspected.
- Controls have declared reference anchors and observation-coverage evidence; they never receive fake tornado IDs. Positive retrospective anchors remain explicitly marked. Selection using outcome tracks can bias even a pre-onset dataset; do not describe it as a prospective deployment evaluation.
- Many candidate profiles and volumes may link to one case, and one input may link to many cases. At most one selected input of each type is permitted.
- The 10–30-minute end-relative window is a research sampling policy, not a meteorological threshold. Validation needs alternative windows, source latency, spatial representativeness and mode stratification.

## Radar utilities

`radar.py` lists anonymous AWS objects or GCS objects with pagination. Direct scan timestamps are timezone-aware UTC. It checks every UTC date crossed by the search window, allows a discovery padding for scans whose start precedes the eligible end window, excludes MDM files, and ranks eligible decoded volumes near the window midpoint.

The Google bucket's inspected `2024/05/21/KILX/` prefix contains hourly TAR objects, not direct scan objects. TAR discovery and bounded in-memory member enumeration are separate from direct AWS scan download. No member is extracted to disk. An optional Py-ART decoder accepts a byte stream; ray-time offsets provide full-volume start/end. Historical availability still needs independent evidence. This is a set of composable utilities, not a production ingestion job. Listing/TAR/decoder tests use fixtures; live Py-ART decoding and full archive ingestion remain unverified. Byte limits do not guarantee bounded decoded memory.

Use AWS bucket `unidata-nexrad-level2`; the older NOAA bucket was deprecated in 2025. For GCS archive members, persist a distinct object URI such as the archive URI plus `#member-name`, alongside the separate archive member field.

## Wind feature engineering

`kinematics.py` accepts heights in meters AGL and winds/storm motion in m/s. It interpolates layer endpoints, never extrapolates a missing surface, computes piecewise-linear SRH and bulk shear, and preserves 0–500 m, 0–1 km, 0–3 km and 1–3 km diagnostics. Missing or insufficient profiles remain missing with QC.

The signed streamwise fraction uses horizontal vorticity `(-dv/dz, du/dz)` projected onto storm-relative flow. It is a shear-weighted layer integral evaluated by midpoint quadrature, in [-1,1], and is undefined for zero shear or calm storm-relative flow. This definition must be compared with alternative weighting, finer vertical resolution and reference implementations. It is not a bulk critical-angle surrogate. Thermodynamics, effective-inflow diagnostics and MetPy/Herbie extraction are not implemented yet.

## Scientific review

Treat the pasted research narrative as hypotheses requiring a citation audit, not validated calibration. Coffer et al. (2019), Table 3, reports SRH500 optimum 144.3 m²/s² and TSS 0.529 in its particular sample; it does not report the supplied ~40 optimum. Its 0–3 km CAPE TSS is 0.094, not 0.380. Streamwise ratio did not outperform SRH in that analysis. Thresholds depend on dataset, sampling and storm-motion conventions and cannot be transferred directly into public risk language.

Coffer et al. (2025) found improved discrimination from deeper SRH layers with observed storm motions in its GridRad/HRRR framework. Retain competing layers and motion methods rather than assume universal superiority of a shallow layer. Observed-motion results do not license use of future radar-derived motion in a prospective predictor.

The proposed weights, fraction threshold, score >5 interpretation, precise RFD deficits and fixed solar-recovery durations have not been validated for WHIRL. Ambient LCL/moisture are proxies, not measurements of RFD temperature. CAPE does not directly determine dynamic perturbation pressure acceleration. No proposed gates or weights are implemented. Fit transformations only on training groups, pre-register evaluation choices, and report independent temporal/regional validation, reliability, sample uncertainty and failure modes before probability language.

Primary references:

- Coffer et al. 2019: https://repository.library.noaa.gov/view/noaa/52891/noaa_52891_DS1.pdf
- Coffer et al. 2025: https://arxiv.org/abs/2503.15466
- AWS archive: https://registry.opendata.aws/noaa-nexrad/
- Google public datasets: https://docs.cloud.google.com/storage/docs/public-datasets
- Py-ART reader: https://arm-doe.github.io/pyart/_modules/pyart/io/nexrad_archive.html
- PostGIS geometry behavior: https://postgis.net/docs/ST_StartPoint.html

## Next milestones

1. Execute migrations/constraints on a real PostGIS instance; add database-role separation and reproducible ingest/export manifests.
2. Build Herbie/MetPy extraction with native vertical levels, terrain/AGL and parcel conventions, historical availability and unit/reference checks. Validate wind diagnostics against MetPy and independent analytical profiles.
3. Decode real AWS/GCS volumes, verify end times and source latency, preserve sweeps/beam geometry, and add ingestion retries/cache/manifests.
4. Curate reviewed positive/control pilot cases; reconcile duplicate tracks and split whole outbreaks before preprocessing or fitting.
5. Evaluate competing diagnostics and baselines without selecting thresholds on held-out data. Connect validated products to the map only after provenance and uncertainty contracts are enforced.
