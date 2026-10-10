# WHIRL — Witter–Hart Integrated Rotational Likelihood

**Status:** research prototype. Not an operational forecast, tornado probability, official warning, or storm-intercept directive.

## Products

- **WHIRL-E (0–10):** environmental tornado-favorability diagnostic, day 5 through day 0. Version 0.1 implements a weighted prototype requiring six normalized components in [0,1]. Component normalizers are NOT yet implemented; do not present a real weather-data score until normalization is specified and validated.
- **WHIRL-L (planned):** storm-object nowcasting, using tracked radar features, quality-controlled storm motion, dual-pol signals, storm mergers, and environment. Should output calibrated hazard probabilities with horizons and uncertainty, not raw radar intensity as tornado certainty.
- **WHIRL-S (planned):** significant tornado (EF2+) environment assessment, conditioned on storm occurrence and mode. Do not infer prospective EF4/EF5 rating from an index.

## Experimental WHIRL-E v0.1

Score = 10 × (0.25 Rotation + 0.20 Instability + 0.15 Organization + 0.15 Moisture + 0.15 Initiation + 0.10 Boundaries).

Inputs are conceptual dimensionless sub-scores. The initial gate caps are illustrative assumptions only: surfaceBased=false caps score at 2; initiationExpected=false caps score at 3. These are **not validated thresholds**. Missing inputs return `insufficient-data`, never zero or an invented score.

| Component | Weight | Candidate meteorological inputs |
|---|---:|---|
| Rotation | 25% | 0–500m SRH, 0–1km SRH, 0–1km shear, storm-relative inflow |
| Instability | 20% | MLCAPE, 0–3km CAPE, MLCIN, lapse rates |
| Organization | 15% | effective bulk shear, hodograph curvature, storm-relative winds |
| Moisture | 15% | MLLCL, surface dewpoint, boundary-layer moisture depth |
| Initiation | 15% | convergence, lift, cap erosion, CAM initiation agreement, expected storm mode |
| Boundaries | 10% | warm front/outflow/dryline proximity, surface wind backing, observed trends |

## Companion indices

- **HART (0–100):** Helicity, Atmospheric Rotation & Tornadogenesis; diagnostic of low-level kinematics, not standalone tornado risk.
- **STORM TARGET (0–100):** chase-region observability and logistics, separated from hazard likelihood; never optimizes driving into warnings.
- **WHIRL-CONFIDENCE:** input recency, model spread, observational agreement, sample support, and calibration reliability. Not a proxy for tornado probability.

## Validation requirements

1. Construct an event-and-non-event dataset using forecast fields available *at issue time*, SPC/NWS archives, Storm Data, and quality-controlled tornado reports.
2. Separate storm occurrence, tornado occurrence conditional on storms, and significant tornado occurrence; include QLCS and elevated cases, not only classic supercells.
3. Use time- and event-blocked out-of-sample testing to avoid leakage. Evaluate by region/season and lead time.
4. Compare to STP, SCP, SPC probabilities, and persistence. Report Brier score, reliability diagrams, precision/recall, ROC/PR, false alarms and missed events.
5. Calibrate outputs separately for Day 5/3/1/0 and 0–90min; provide spatial and temporal uncertainty.
6. Never label a 7/10 diagnostic as 70% tornado probability. Official NWS warnings override research guidance.

## Key references

- NOAA SPC mesoanalysis parameter documentation: https://www.spc.noaa.gov/exper/mesoanalysis/help/help_stp.html
- NOAA NSSL Warn-on-Forecast and TORP research: https://www.nssl.noaa.gov/research/tornadoes/
- NOAA NSSL tornado forecasting: https://www.nssl.noaa.gov/education/svrwx101/tornadoes/forecasting/
