# StormChase Observatory v0.8 — 2026-10-10

New experience: dark orbital design, Orbit/Ion/Ember themes, focus view, default live point mode, search/map point sampling, real hourly timeline, ingredient experiment sliders, partial fingerprint chart, pinned comparison and scenario JSON export/import. Simulated hotspots and current official map products remain distinct modes. No experimental tornado score or computed risk hotspot is produced.

Real connections: Open-Meteo GFS API delivers NOAA GFS/HRRR seamless model guidance; NWS points → forecastHourly delivers an independent official forecast; existing SPC categorical/NWS alert feeds remain on demand. Six-day model series includes CAPE, CIN, surface moisture/temperature, 10 m winds, cloud cover and precipitation. Full SRH/effective shear/MLLCL remain unknown until manually assumed. Provider parcel definition and a unique model run initialization are not verified by this endpoint.

Verification: 20 website tests passed, production build succeeded, portable preview parsed and booted with simulated WebGL failure. Real HTTP checks returned 144 hourly model rows and 156 NWS periods for Belleville. Open-Meteo returned permissive CORS headers. Browser/device/WebGL/mobile visual inspection was unavailable; do not describe DOM tests as rendered browser QA. v0.7 offline research files are retained without changes.

No public deployment; no GitHub remote push. Preview requires an internet connection for live feeds and WebGL for the map. If requests fail, explicit errors and missing values remain visible. Model/NWS point freshness is one hour; official map-feed freshness is five minutes. No GPS permission is requested on the forecast page.

Next: actual browser/mobile QA, cached server adapter and rate controls, geocoding, independent model runs, full soundings, live radar/observations, reviewed historical case comparison. See README and architecture backlog.
