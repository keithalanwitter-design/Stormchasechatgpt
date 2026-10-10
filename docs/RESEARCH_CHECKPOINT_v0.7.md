# Research checkpoint v0.7 — 2026-10-10

Implemented a separate offline research package: versioned PostGIS labels/inputs/cases, true many-to-many associations, conservative pre-onset eligibility, an executed DuckDB/Parquet mart, anonymous radar archive utilities and unit-explicit wind feature engineering. The browser and its synthetic forecasts remain v0.6; this release does not connect experimental research to operational forecasts.

Verification: 20 Python tests passed, including real temporary Parquet exports and DuckDB queries, PostgreSQL syntax parsing, archive pagination/midnight/TAR fixtures and analytical wind profiles. Existing 15 JavaScript tests passed. Production build verified. No public deployment or remote GitHub push. Local Git history is included in the source archive.

Limits: PostGIS execution/roles, live radar decoding, historical availability evidence, HRRR/MetPy extraction, browser WebGL/mobile checks and statistical validation remain outstanding. SQL guards reduce temporal leakage but cannot prove spatial representativeness, correct labels or unbiased case selection. Full ingest manifests and role enforcement must precede production use.

Prioritized work and scientific source corrections are in research/README.md. Proposed numerical weights and tornado-probability language have not been implemented.
