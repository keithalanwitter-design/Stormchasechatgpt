"""Anonymous archive discovery + conservative pre-onset selection.

Discovery timestamps are candidates, not proof of historical availability.
No retrospective label or decoder output becomes a forecast probability.
"""
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import io
import json
import math
import re
import tarfile
from typing import Callable, Iterable
from urllib.parse import quote, urlencode
from urllib.request import urlopen
import xml.etree.ElementTree as ET

def is_valid_padding(value):
    return math.isfinite(value) and 0 <= value <= 120

UTC = timezone.utc
AWS_BUCKET = 'unidata-nexrad-level2'
GCS_BUCKET = 'gcp-public-data-nexrad-l2'
MAX_BYTES = 256 * 1024 * 1024  # Bounded archive/raw payload; not a decoded-memory bound.
SCAN_NAME = re.compile(r'^([A-Z][A-Z0-9]{3})(\d{8})_(\d{6})(?:_V\d\d)?(?:\.gz)?$')


def require_utc(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError('Timezone-aware datetime required')
    return value.astimezone(UTC)


def scan_timestamp(key: str, site: str | None = None) -> datetime | None:
    match = SCAN_NAME.fullmatch(key.rsplit('/', 1)[-1])
    if not match or (site and match[1] != site.upper()):
        return None  # Reject TARs, MDMs, foreign sites and malformed names.
    try:
        return datetime.strptime(match[2] + match[3], '%Y%m%d%H%M%S').replace(tzinfo=UTC)
    except ValueError:
        return None


def _bounds(reference: datetime, min_lead: float, max_lead: float):
    reference = require_utc(reference)
    if not all(math.isfinite(x) for x in [min_lead, max_lead]) or not 0 <= min_lead <= max_lead <= 1440:
        raise ValueError('Require 0 <= min lead <= max lead <= 1440 minutes')
    return reference - timedelta(minutes=max_lead), reference - timedelta(minutes=min_lead)


def utc_prefixes(site: str, reference: datetime, min_lead=10.0, max_lead=30.0) -> list[str]:
    site = site.upper()
    if not re.fullmatch(r'[A-Z][A-Z0-9]{3}', site):
        raise ValueError('Invalid radar site')
    lo, hi = _bounds(reference, min_lead, max_lead)
    day = lo.replace(hour=0, minute=0, second=0, microsecond=0)
    result = []
    while day.date() <= hi.date():
        result.append(f'{day:%Y/%m/%d}/{site}/')
        day += timedelta(days=1)
    return result


@dataclass(frozen=True)
class Volume:
    key: str
    site: str
    start: datetime
    end: datetime | None = None
    available: datetime | None = None
    availability_basis: str = 'unknown'
    availability_evidence: str | None = None


def discover_direct_scans(list_keys: Callable[[str], Iterable[str]], site: str,
                          reference: datetime, min_lead=10.0, max_lead=30.0, discovery_padding_minutes=20.0) -> list[Volume]:
    """Enumerate EVERY intersecting UTC date even when current-day matches exist."""
    lo, hi = _bounds(reference, min_lead, max_lead)
    if not is_valid_padding(discovery_padding_minutes):
        raise ValueError('Discovery padding must be finite, 0–120 minutes')
    lo -= timedelta(minutes=discovery_padding_minutes)
    result = {}
    for prefix in utc_prefixes(site, reference, min_lead, max_lead+discovery_padding_minutes):
        for key in list_keys(prefix):
            stamp = scan_timestamp(key, site)
            if stamp is not None and lo <= stamp <= hi:
                result[key] = Volume(key, site.upper(), stamp)
    return sorted(result.values(), key=lambda v: (v.start, v.key))


def select_preonset_volume(volumes: Iterable[Volume], reference: datetime,
                          prediction: datetime, min_lead=10.0, max_lead=30.0) -> Volume | None:
    """Window is measured from volume END; availability must be known at cutoff.

    Rank by distance to window midpoint (then earlier end, then key), not by
    closeness to touchdown. Unknown end/availability never passes this guard.
    """
    reference, prediction = require_utc(reference), require_utc(prediction)
    lo, hi = _bounds(reference, min_lead, max_lead)
    if prediction > reference:
        raise ValueError('Prediction cannot follow reference time')
    eligible = []
    midpoint = lo + (hi - lo) / 2
    for v in volumes:
        if v.end is None or v.available is None or v.availability_basis not in ('recorded', 'documented') or not v.availability_evidence:
            continue
        start, end, available = map(require_utc, (v.start, v.end, v.available))
        if start <= end <= available <= prediction and lo <= end <= hi:
            eligible.append(v)
    return min(eligible, key=lambda v: (abs((v.end - midpoint).total_seconds()), v.end, v.key), default=None)


def _get(url: str, limit: int = MAX_BYTES) -> bytes:
    with urlopen(url, timeout=30) as response:
        size = response.headers.get('Content-Length')
        if size and int(size) > limit:
            raise ValueError('Archive response exceeds configured byte limit')
        payload = response.read(limit + 1)
    if len(payload) > limit:
        raise ValueError('Archive response exceeds configured byte limit')
    return payload


def aws_keys(prefix: str, bucket: str = AWS_BUCKET, get=_get) -> Iterable[str]:
    if not re.fullmatch(r'[a-z0-9][a-z0-9.-]+', bucket):
        raise ValueError('Invalid S3 bucket name')
    token = None
    ns = {'s': 'http://s3.amazonaws.com/doc/2006-03-01/'}
    while True:
        args = {'list-type': '2', 'prefix': prefix, 'max-keys': 1000}
        if token:
            args['continuation-token'] = token
        root = ET.fromstring(get(f'https://{bucket}.s3.amazonaws.com/?{urlencode(args)}'))
        yield from (e.text for e in root.findall('s:Contents/s:Key', ns) if e.text)
        if root.findtext('s:IsTruncated', default='false', namespaces=ns) != 'true':
            break
        new_token = root.findtext('s:NextContinuationToken', namespaces=ns)
        if not new_token or new_token == token:
            raise ValueError('Truncated S3 listing without advancing pagination')
        token = new_token


def gcs_keys(prefix: str, bucket: str = GCS_BUCKET, get=_get) -> Iterable[str]:
    if not re.fullmatch(r'[a-z0-9][a-z0-9._-]+', bucket):
        raise ValueError('Invalid GCS bucket name')
    token = None
    while True:
        args = {'prefix': prefix, 'maxResults': 1000}
        if token:
            args['pageToken'] = token
        data = json.loads(get(f'https://storage.googleapis.com/storage/v1/b/{bucket}/o?{urlencode(args)}'))
        yield from (x['name'] for x in data.get('items', []))
        new_token = data.get('nextPageToken')
        if not new_token:
            break
        if new_token == token:
            raise ValueError('GCS pagination did not advance')
        token = new_token


def gcs_tar_candidates(keys: Iterable[str], site: str, reference: datetime,
                       min_lead=10.0, max_lead=30.0, discovery_padding_minutes=20.0) -> list[str]:
    """Google stores hour-bundled TARs: filter overlap before bounded download."""
    lo, hi = _bounds(reference, min_lead, max_lead)
    if not is_valid_padding(discovery_padding_minutes):
        raise ValueError('Invalid discovery padding')
    lo -= timedelta(minutes=discovery_padding_minutes)
    pattern = re.compile(r'NWS_NEXRAD_[A-Z0-9]+_' + re.escape(site.upper()) + r'_(\d{14})_(\d{14})\.tar$')
    result = []
    for key in keys:
        match = pattern.search(key.rsplit('/', 1)[-1])
        if not match:
            continue
        start, end = [datetime.strptime(x, '%Y%m%d%H%M%S').replace(tzinfo=UTC) for x in match.groups()]
        if start <= hi and end >= lo:
            result.append(key)
    return sorted(set(result))


def tar_scan_members(payload: bytes, site: str, reference: datetime,
                     min_lead=10.0, max_lead=30.0, discovery_padding_minutes=20.0) -> Iterable[tuple[str, datetime, bytes]]:
    """No filesystem extraction; read bounded matching regular members only."""
    if len(payload) > MAX_BYTES:
        raise ValueError('Container exceeds byte limit')
    lo, hi = _bounds(reference, min_lead, max_lead)
    if not is_valid_padding(discovery_padding_minutes):
        raise ValueError('Invalid discovery padding')
    lo -= timedelta(minutes=discovery_padding_minutes)
    with tarfile.open(fileobj=io.BytesIO(payload), mode='r:*') as archive:
        total = 0
        for index, member in enumerate(archive):
            total += member.size
            if index >= 10000 or member.size < 0 or total > MAX_BYTES:
                raise ValueError('TAR contents exceed limits')
            stamp = scan_timestamp(member.name, site)
            if not member.isfile() or stamp is None or not lo <= stamp <= hi:
                continue
            file = archive.extractfile(member)
            if file is None:
                continue
            raw = file.read(MAX_BYTES + 1)
            if len(raw) != member.size or len(raw) > MAX_BYTES:
                raise ValueError('Incomplete or oversized TAR member')
            yield member.name, stamp, raw


def download_scan(key: str, provider='AWS', bucket: str | None = None, get=_get) -> dict:
    """Download raw candidate with provenance, WITHOUT certifying eligibility."""
    if scan_timestamp(key) is None:
        raise ValueError('Expected direct scan filename; TAR containers require member handling')
    if provider == 'AWS':
        bucket = bucket or AWS_BUCKET
        url = f'https://{bucket}.s3.amazonaws.com/{quote(key, safe="/")}'
        uri = f's3://{bucket}/{key}'
    elif provider == 'GCS':
        bucket = bucket or GCS_BUCKET
        url = f'https://storage.googleapis.com/{bucket}/{quote(key, safe="/")}'
        uri = f'gs://{bucket}/{key}'
    else:
        raise ValueError('Unsupported provider')
    if not re.fullmatch(r'[a-z0-9][a-z0-9._-]+', bucket):
        raise ValueError('Invalid archive bucket')
    raw = get(url)
    if len(raw) > MAX_BYTES:
        raise ValueError('Scan exceeds byte limit')
    return {'payload': raw, 'object_uri': uri, 'content_sha256': sha256(raw).hexdigest(),
            'retrieved_utc': datetime.now(UTC).isoformat(), 'availability_basis': 'unknown'}


def decode_scan(payload: bytes, reader=None):
    """Optional Py-ART decoder; installation and real-volume validation are separate."""
    if len(payload) > MAX_BYTES:
        raise ValueError('Scan exceeds byte limit')
    if reader is None:
        try:
            import pyart
        except ImportError as exc:
            raise RuntimeError('Install the optional arm_pyart package to decode Level II volumes') from exc
        reader = pyart.io.read_nexrad_archive
    return reader(io.BytesIO(payload))


def decoded_volume_times(radar) -> tuple[datetime, datetime]:
    """Use all decoded ray times, not the filename or the first sweep alone."""
    units = radar.time.get('units', '')
    if not units.startswith('seconds since '):
        raise ValueError('Unsupported radar time coordinate')
    text = units[len('seconds since '):].strip().replace('Z', '+00:00')
    base = datetime.fromisoformat(text)
    if base.tzinfo is None:
        # Py-ART Level II time units are UTC; preserve this explicit decoder convention.
        base = base.replace(tzinfo=UTC)
    base = require_utc(base)
    offsets = [float(x) for x in radar.time['data']]
    if not offsets or not all(math.isfinite(x) and x >= 0 for x in offsets):
        raise ValueError('Missing or invalid decoded ray times')
    return base+timedelta(seconds=min(offsets)), base+timedelta(seconds=max(offsets))
