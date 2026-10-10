"""Versioned, unit-explicit wind diagnostics; no empirical weights or risk score.

z: meters AGL; u/v/storm motion: m/s in east/north Cartesian coordinates.
Ambient omega_h=(-dv/dz,du/dz) neglects horizontal gradients of vertical velocity.
The streamwise fraction is SIGNED and shear-thickness weighted, not a surface
critical-angle identity and not an assumed universal tornado threshold.
"""
from bisect import bisect_left
from math import hypot, isfinite

VERSION = 'wind-piecewise-linear-0.7'


def _profile(z, u, v):
    z, u, v = tuple(z), tuple(u), tuple(v)
    if not len(z) == len(u) == len(v) or len(z) < 2:
        raise ValueError('Equal-length profiles with at least two levels required')
    if not all(isfinite(x) for arr in (z, u, v) for x in arr):
        raise ValueError('Missing/nonfinite data must be handled before calculation')
    if z[0] < 0 or any(b <= a for a, b in zip(z, z[1:])):
        raise ValueError('Require strictly increasing nonnegative AGL heights')
    return z, u, v


def _interpolate(z, w, height):
    if not z[0] <= height <= z[-1]:
        raise ValueError('Requested layer not covered; no extrapolation allowed')
    i = bisect_left(z, height)
    if z[i] == height:
        return w[i]
    fraction = (height-z[i-1])/(z[i]-z[i-1])
    return w[i-1] + fraction*(w[i]-w[i-1])


def layer_diagnostics(z, u, v, storm_u, storm_v, bottom=0.0, top=500.0):
    z, u, v = _profile(z, u, v)
    if not all(isfinite(x) for x in (storm_u, storm_v, bottom, top)) or not 0 <= bottom < top:
        raise ValueError('Finite motion and valid layer bounds required')
    levels = [bottom, *[h for h in z if bottom < h < top], top]
    us = [_interpolate(z, u, h) for h in levels]
    vs = [_interpolate(z, v, h) for h in levels]
    srh, stream_integral, magnitude_integral = 0.0, 0.0, 0.0
    undefined_alignment = False
    for i, (a, b) in enumerate(zip(levels, levels[1:])):
        dz = b-a
        du, dv = us[i+1]-us[i], vs[i+1]-vs[i]
        um, vm = (us[i]+us[i+1])/2-storm_u, (vs[i]+vs[i+1])/2-storm_v
        wx, wy = -dv/dz, du/dz
        srh += vm*du - um*dv
        wind, vort = hypot(um, vm), hypot(wx, wy)
        magnitude_integral += vort*dz
        if wind <= 1e-9 and vort > 1e-12:
            undefined_alignment = True
        elif wind > 1e-9:
            stream_integral += (um*wx+vm*wy)/wind*dz
    fraction = None if undefined_alignment or magnitude_integral <= 1e-12 else stream_integral/magnitude_integral
    return {'algorithm_version': VERSION, 'bottom_agl_m': bottom, 'top_agl_m': top,
            'srh_m2s2': srh, 'bulk_shear_ms': hypot(us[-1]-us[0], vs[-1]-vs[0]),
            'streamwise_fraction_signed': None if fraction is None else max(-1.0, min(1.0, fraction)),
            'max_segment_depth_m': max(b-a for a,b in zip(levels,levels[1:])),
            'native_levels_in_layer': sum(bottom <= h <= top for h in z),
            'quadrature': 'piecewise-linear wind; midpoint alignment per segment'}


def engineer_wind_features(z, u, v, storm_u, storm_v):
    z, u, v = _profile(z, u, v)
    result = {'algorithm_version': VERSION, 'missing': {}, 'qc': {}}
    for key, bottom, top in [('0_500m',0,500),('0_1km',0,1000),('0_3km',0,3000),('1_3km',1000,3000),('0_6km',0,6000)]:
        if z[0] > bottom or z[-1] < top:
            result['missing'][key] = 'Layer not covered; no surface/downward or upper extrapolation'
            result['srh_'+key] = None
            result['shear_'+key+'_ms'] = None
            if key=='0_500m':result['streamwise_fraction_0_500m'] = None
            continue
        diag = layer_diagnostics(z,u,v,storm_u,storm_v,bottom,top)
        result['srh_'+key] = diag['srh_m2s2']
        result['shear_'+key+'_ms'] = diag['bulk_shear_ms']
        result['qc'][key] = {'native_levels': diag['native_levels_in_layer'], 'max_gap_m': diag['max_segment_depth_m']}
        if key=='0_500m':result['streamwise_fraction_0_500m'] = diag['streamwise_fraction_signed']
    return result
