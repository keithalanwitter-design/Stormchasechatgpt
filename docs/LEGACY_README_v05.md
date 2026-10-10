# StormChase Field Command (v0.1)

Mobile-first personal storm-monitoring PWA, designed for eventual public expansion.

## What works
- Interactive MapLibre map, dark basemap, pan/zoom
- Optional device GPS (HTTPS or localhost required), location marker and distance estimates
- RainViewer **reflectivity** tile overlay (subject to third-party feed availability)
- Official NWS active alerts **at the current map center point** via weather.gov, with headline, instructions and area information
- Automatic refresh every five minutes; manual refresh button
- Links to official SPC MCD, watches, reports, mesoanalysis, METAR and GOES
- Field notes stored locally in the browser
- Installable PWA manifest (offline operation not implemented)

## Important limitations
- **Not an official weather service.** The radar feed can lag or be unavailable; alerts are queried at the map's **center point**, not for the full visible map or your GPS unless you center there. The alert pins are rough geometry centroids, **not precise warning boundaries**. The prototype intentionally does not provide a route or storm intercept directive.
- RainViewer is a third-party service; validate licensing, terms, reliability and usage limits before a public launch.
- No storm-relative velocity, Level II decoding, cell tracking, tornado probability, automated ETA, watch escalation, LSR verification, METAR analytics, or AI photo analysis yet.
- No offline radar/alerts. Do not use this application as your only warning source.
- The source API may enforce rate limits or CORS restrictions. For a public version, use a caching Cloudflare Worker and appropriate API identification.
- User location and notes remain local to their device in this prototype; GPS coordinates are not sent to an application backend.

## Local development
Requires Node.js 20.19+ or 22+.

```bash
npm install
npm run dev
```

Open the URL printed by Vite. Browser GPS works on localhost or deployed HTTPS.

## Build

```bash
npm install
npm run build
```

Output: `dist/`.

## GitHub → Cloudflare Pages deployment
1. Create a new GitHub repository, e.g. `stormchase-command`.
2. Upload/commit all files from this folder, including `.github`.
3. In Cloudflare Pages choose **Connect to Git**, select the repository.
4. Framework preset **Vite**, build command `npm run build`, output directory `dist`.
5. Deploy. Cloudflare supplies an HTTPS URL. Test GPS and third-party radar tile availability from Android.

For custom-domain hosting, connect the domain in Cloudflare Pages settings.

## Architecture / expansion plan

```
Android browser / installed PWA
  -> Vite + MapLibre frontend (Cloudflare Pages)
  -> Official NWS alerts (direct for prototype)
  -> Third-party radar reflectivity tiles (prototype)
  -> SPC and satellite external official links

Next:
  -> Cloudflare Worker ingestion/caching/provenance
  -> R2 storage for imagery and archived scans
  -> D1 database for users, storm tracks, field notes
  -> Level II radar processing service for reflectivity/velocity/CC
  -> Storm object tracking + motion uncertainty + warning intersection
  -> AI explanation service with source timestamps, confidence, safety checks
```

## Safety design principles
1. Official NWS warnings always override experimental guidance.
2. Show source timestamp, ingestion timestamp and stale-data state.
3. Never suggest routes crossing warned or potentially hazardous areas.
4. No precise tornado location or arrival estimate from one radar image.
5. AI output should be evidence-linked, uncertainty-aware and clearly labeled non-official.

## License
Private prototype; choose a license before public distribution.

## Forecasting-first development (October 2026)
This project now prioritizes spring 2027 research use over immediate deployment. Open `/forecast-lab.html` for an educational parameter explorer. Read `FORECAST_ARCHITECTURE.md` and `FORECAST_PARAMETERS.md` for the forecast engine design and verification plan. The forecast lab does **not** yet ingest numerical model grids or produce tornado probabilities.
