# WHIRL Lab v0.5 — Collaborative Off-Season Prototype

Open `/whirl-lab.html` after starting the Vite dev server. The main field dashboard links to it.

## What works
- Five synthetic atmospheric scenarios, with six adjustable 0–100 ingredient favorability scores.
- WHIRL-E weighted diagnostic, per-factor contributions, unvalidated physical caps for surface-based inflow and storm initiation.
- Experimental weight adjustment with automatic normalization and one-at-a-time sensitivity ranking.
- Conceptual, explicitly non-geographic overlay sandbox with clickable sample target zones and layer toggles.
- Three-scenario comparison, local notes, JSON export, browser persistence, shareable URL scenario snapshots (once hosted).

## What does NOT work yet
- No live HRRR/RAP data, real forecast map, soundings, real SPC polygons, storm detection, radar analysis, or calibrated tornado probabilities.
- Inputs are synthetic favorability judgments rather than meteorological measurements. No claims of predictive skill.
- Share URL contains scenario inputs and notes in its fragment. Do not include private information in notes you share.

## Research exercise with Brian
1. Select the `High energy, strong cap` scenario. Notice why a favorable environment can still fail to produce storms.
2. Change initiation and storm mode, then test whether the composite responds sensibly.
3. Increase the low-level rotation weight and observe how the relative ranking changes.
4. Compare three scenarios and write down disagreements with the scoring methodology.
5. Export JSON or share the URL after deployment; use the findings to revise versioned weights.

## Next scientific engineering tasks
1. Obtain archived model fields and calculate actual MLCAPE, MLCIN, MLLCL, 0–1 km SRH, 0–500 m shear, effective bulk shear.
2. Add reproducible geographic grids and model-run/valid-time controls.
3. Overlay official SPC outlook polygons and preserve issued-at timestamps.
4. Validate using both tornado cases and non-events, spatial/temporal matching, train/test separation, reliability and false-alarm analysis.
5. Build independent storm-mode and initiation diagnostics; avoid conflating environment favorability with tornado probability.
