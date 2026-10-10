# Data provenance

## Bundled map geography

Natural Earth 1:110m public-domain datasets from the project's vector repository:

- https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson
- https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_1_states_provinces.geojson

Retrieved October 10, 2026. Properties reduced to names; coordinate precision rounded to 0.001 degrees. This is coarse display context, not precise weather geometry or a navigation map. The source files are retained under `public/geography`; transformed copies are bundled from `src/geography`. Labels use a fixed eight-city reference list.

## Synthetic environment fixtures

Author-created illustration, `demo-geography-0.6`; run May 18, 2027 00 UTC. Three example U.S. polygons and ingredient values, deterministically varied for lead/model UI exercises. No meteorological calculation, data ingestion or fitted WHIRL model generated these values. Model names identify comparison controls only. Data age and calibrated confidence are inapplicable. No WHIRL score, actual outbreak or tornado path is attached.

## Official runtime adapters

NWS active actual alerts: https://api.weather.gov/alerts/active?status=actual

Documentation: https://www.weather.gov/documentation/services-web-api

SPC Day 1 categorical polygons: https://www.spc.noaa.gov/products/outlook/day1otlk_cat.lyr.geojson

Documentation/source index: https://www.spc.noaa.gov/gis/

Retain source URL, retrieval time, issue time and expiry. SPC categorical risk is not tornado probability. NWS feature issue and expiry differ across alerts; aggregate displayed times are latest issue/expiry, while alert details retain individual times. An empty current response is not an all-clear. Direct fetch may fail from browser CORS or network conditions; no synthetic substitute is inserted.

## Research source hierarchy

SPC actual tornado tracks and reconciled NCEI final records form positive labels. DAT is supplementary geometry; preliminary LSR/field observations are separate. A control needs coverage evidence. Radar scans, models and observations need declared availability and pre-onset timestamps. Final surveys, revised records and debris evidence cannot become pre-event model inputs. The case intake does elementary checks only; source reconciliation and forecast availability verification are future work.
