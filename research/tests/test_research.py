import io
import json
import math
from pathlib import Path
import tarfile
import tempfile
from types import SimpleNamespace
import unittest
from datetime import datetime, timedelta, timezone
from whirl_research.radar import (scan_timestamp,utc_prefixes,Volume,discover_direct_scans,
 select_preonset_volume,aws_keys,gcs_keys,gcs_tar_candidates,tar_scan_members,decode_scan,decoded_volume_times,download_scan)
from whirl_research.kinematics import layer_diagnostics,engineer_wind_features

def dt(s):return datetime.fromisoformat(s.replace('Z','+00:00'))

class RadarTests(unittest.TestCase):
 def test_timestamps_and_sites(self):
  self.assertEqual(scan_timestamp('2024/05/21/KILX/KILX20240521_201530_V06'),dt('2024-05-21T20:15:30Z'))
  for name in ['KILX20240521_201530_V06_MDM','KILX20241321_201530_V06','KILX20240521_201530_V06.tar','evil20240521_201530_V06']:
   self.assertIsNone(scan_timestamp(name))
  self.assertIsNone(scan_timestamp('KLSX20240521_201530_V06','KILX'))
 def test_timezone_and_midnight_enumeration(self):
  ref=dt('2024-05-22T00:15:00Z');self.assertEqual(utc_prefixes('kilx',ref),['2024/05/21/KILX/','2024/05/22/KILX/'])
  seen=[]
  def listing(prefix):
   seen.append(prefix)
   return [prefix+('KILX20240521_235500_V06' if '/21/' in prefix else 'KILX20240522_000100_V06')]
  self.assertEqual(len(discover_direct_scans(listing,'KILX',ref)),2);self.assertEqual(len(seen),2)
  self.assertEqual(scan_timestamp('KILX20240522_000100_V06').tzinfo,timezone.utc)
  with self.assertRaises(ValueError):utc_prefixes('KILX',datetime(2024,5,22))
  with self.assertRaises(ValueError):utc_prefixes('KILX',ref,30,10)
 def test_midpoint_and_availability(self):
  ref=dt('2024-05-22T00:30:00Z');cut=ref-timedelta(minutes=10)
  def v(name,lead,available=None):
   end=ref-timedelta(minutes=lead)
   return Volume(name,'KILX',end-timedelta(minutes=4),end,available or end+timedelta(seconds=30),'documented','fixture latency')
  best=select_preonset_volume([v('near-onset',11),v('midpoint',20),v('far',29)],ref,cut)
  self.assertEqual(best.key,'midpoint')
  self.assertIsNone(select_preonset_volume([v('late',20,ref)],ref,cut))
  unknown=Volume('unknown','KILX',ref-timedelta(minutes=20))
  self.assertIsNone(select_preonset_volume([unknown],ref,cut))
  crossing=Volume('cross','KILX',cut-timedelta(minutes=2),cut+timedelta(minutes=2),cut+timedelta(minutes=3),'recorded','log')
  self.assertIsNone(select_preonset_volume([crossing],ref,cut))
 def test_discovery_does_not_drop_volume_starting_before_end_window(self):
  ref=dt('2024-05-21T20:30:00Z')
  items=discover_direct_scans(lambda p:[p+'KILX20240521_195500_V06'],'KILX',ref)
  self.assertEqual(len(items),1) # Starts 35 min before onset; can end inside the 30-min window.
 def test_paginated_aws_listing(self):
  calls=[]
  def get(url):
   calls.append(url);n=len(calls)
   return f'<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Contents><Key>key{n}</Key></Contents><IsTruncated>{"true" if n==1 else "false"}</IsTruncated><NextContinuationToken>next</NextContinuationToken></ListBucketResult>'.encode()
  self.assertEqual(list(aws_keys('prefix/',get=get)),['key1','key2']);self.assertIn('continuation-token=next',calls[1])
 def test_paginated_gcs_listing(self):
  calls=[]
  def get(url):
   calls.append(url)
   return json.dumps({'items':[{'name':'first'}],'nextPageToken':'next'} if len(calls)==1 else {'items':[{'name':'second'}]}).encode()
  self.assertEqual(list(gcs_keys('prefix/',get=get)),['first','second']);self.assertIn('pageToken=next',calls[1])
 def test_tar_discovery_and_bounded_member_access(self):
  ref=dt('2024-05-22T00:15:00Z')
  keys=['2024/05/21/KILX/NWS_NEXRAD_NXL2DPBL_KILX_20240521230000_20240521235959.tar',
        '2024/05/22/KILX/NWS_NEXRAD_NXL2DPBL_KILX_20240522000000_20240522005959.tar']
  self.assertEqual(len(gcs_tar_candidates(keys,'KILX',ref)),2)
  buffer=io.BytesIO()
  with tarfile.open(fileobj=buffer,mode='w') as tar:
   for name in ['nested/KILX20240521_235500_V06','KILX20240521_235500_V06_MDM','KLSX20240521_235500_V06']:
    data=b'fixture';entry=tarfile.TarInfo(name);entry.size=len(data);tar.addfile(entry,io.BytesIO(data))
  members=list(tar_scan_members(buffer.getvalue(),'KILX',ref));self.assertEqual(len(members),1);self.assertEqual(members[0][2],b'fixture')
 def test_decoding_and_provenance_do_not_invent_availability(self):
  result=download_scan('2024/05/21/KILX/KILX20240521_201530_V06',get=lambda _:b'fixture')
  self.assertEqual(result['availability_basis'],'unknown');self.assertEqual(len(result['content_sha256']),64)
  self.assertEqual(decode_scan(b'abc',reader=lambda stream:stream.read()),b'abc')
  radar=SimpleNamespace(time={'units':'seconds since 2024-05-21T20:00:00Z','data':[240,0,100]})
  self.assertEqual(decoded_volume_times(radar),(dt('2024-05-21T20:00:00Z'),dt('2024-05-21T20:04:00Z')))

class KinematicsTests(unittest.TestCase):
 def test_exact_linear_srh_and_signed_alignment(self):
  d=layer_diagnostics([0,500],[0,10],[0,0],0,-10)
  self.assertAlmostEqual(d['srh_m2s2'],100)
  self.assertAlmostEqual(d['bulk_shear_ms'],10)
  self.assertAlmostEqual(d['streamwise_fraction_signed'],10/math.hypot(5,10))
  reverse=layer_diagnostics([0,500],[0,10],[0,0],0,10)
  self.assertAlmostEqual(reverse['srh_m2s2'],-100);self.assertLess(reverse['streamwise_fraction_signed'],0)
 def test_translation_invariance_and_interpolation(self):
  a=layer_diagnostics([0,200,600],[0,4,12],[0,0,0],0,-10)
  b=layer_diagnostics([0,200,600],[20,24,32],[30,30,30],20,20)
  self.assertAlmostEqual(a['srh_m2s2'],b['srh_m2s2']);self.assertAlmostEqual(a['srh_m2s2'],100)
 def test_no_extrapolation_or_missing_as_zero(self):
  result=engineer_wind_features([10,100,500],[0,2,10],[0,0,0],0,-10)
  self.assertIsNone(result['srh_0_500m']);self.assertIn('0_500m',result['missing'])
  with self.assertRaises(ValueError):layer_diagnostics([0,500],[0,float('nan')],[0,0],0,0)
  with self.assertRaises(ValueError):layer_diagnostics([0,0],[0,10],[0,0],0,0)
 def test_zero_shear_and_calm_alignment_undefined(self):
  self.assertIsNone(layer_diagnostics([0,500],[1,1],[2,2],0,0)['streamwise_fraction_signed'])
  self.assertIsNone(layer_diagnostics([0,500],[-1,1],[0,0],0,0)['streamwise_fraction_signed'])
 def test_shallow_and_deep_layers_are_retained(self):
  d=engineer_wind_features([0,500,1000,3000,6000],[0,10,20,60,120],[0,0,0,0,0],0,-10)
  self.assertEqual(d['srh_0_500m'],100);self.assertEqual(d['srh_0_3km'],600);self.assertEqual(d['srh_1_3km'],400)

class SQLSyntaxTests(unittest.TestCase):
 def test_postgresql_files_parse(self):
  from pglast import parse_sql
  root=Path(__file__).parents[1]/'sql'
  for path in root.glob('*.sql'):
   self.assertTrue(parse_sql(path.read_text()),path.name)

if __name__=='__main__':unittest.main()
