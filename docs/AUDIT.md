# Source audit — October 10, 2026

Imported `stormchase-whirl-lab-v0.5.zip`, the newest of five source bundles discovered. The uploaded handoff was read locally. Research Program, Chase Field Guide and label-layer research documents were read as context; numerical research and chase thresholds remain unverified hypotheses.

Baseline: JavaScript/Vite, MapLibre, field dashboard, standalone parameter reference, synthetic WHIRL lab, three scoring tests. No dependency lockfile was present. `npm install --ignore-scripts` succeeded, creating a lockfile; baseline build passed and 3/3 tests passed. Existing CI built only and used `npm install`.

v0.6: added Forecast Center entry, coarse bundled globe/regional geography, synthetic ingredient layers/controls, case intake, official feed normalization, DOM smoke tests, portable preview and CI tests. Preserved baseline entry as `field-command.html`; imported scoring formula is unchanged and remains confined to its explicitly synthetic lab. No auto-migration of formula thresholds into the geographic screen.

No matching connected GitHub repository was returned for StormChase or WHIRL. Repository creation is not exposed by the installed connector; therefore source is versioned locally and packaged with a Git bundle, not claimed to be on GitHub. Nothing published or deployed.

Official direct requests returned GeoJSON successfully. At the recorded check, SPC returned 3 polygons and NWS returned 425 active features. Counts change over time and are not bundled into the UI. Browser CORS and visual rendering were not tested. MapLibre itself is mocked in UI smoke tests.

Known inherited risks: old Field Command queries alerts at map-center point, draws rough centroid pins, uses third-party radar tiles and browser-local notes. Its GPS is explicitly enabled by the user. It is preserved as an early prototype, not upgraded into an operational Live Chase Center. No offline radar, real storm rotation processing or route analysis exists.

Final checkpoint checks: 15/15 Node/DOM tests passed; production Vite build passed; portable HTML generation and standalone no-WebGL DOM smoke check passed; Git whitespace checks passed. The standalone check parses actual bundled scripts and exercises the fallback/forecast/research controls, but it is not visual browser QA.
