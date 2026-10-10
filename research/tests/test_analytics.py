import tempfile
import unittest
from pathlib import Path
from datetime import datetime, timezone, timedelta
import duckdb
from whirl_research.analytics import TABLES, PREDICTORS, connect_parquet, predictor_records

T=datetime(2024,5,21,20,tzinfo=timezone.utc)
def time(minutes):return T+timedelta(minutes=minutes)

class MartTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
  self.rows={
   'tornado_ground_truth':[dict(label_id='l',reviewed_utc=time(100),touchdown_utc=time(30))],
   'vertical_profiles':[dict(profile_id='p',source_type='MODEL_ANALYSIS',source_name='HRRR',source_version='v4',availability_basis='recorded',availability_evidence='log',operational_available_utc=time(-10),observation_end_utc=None,init_utc=time(-60),valid_utc=time(-60),lead_minutes=0)],
   'profile_features':[dict(feature_id='f',profile_id='p',algorithm_version='wind-0.7',parcel_definition='ML100',storm_motion_method='bunkers_rm',motion_evidence='precutoff profile',motion_available_utc=time(-10),stp_fixed=None,stp_effective=None,**{k:None for k in PREDICTORS})],
   'radar_volumes':[dict(volume_id='r',availability_basis='recorded',availability_evidence='log',volume_start_utc=time(-1),volume_end_utc=time(5),operational_available_utc=time(6))],
   'case_study_samples':[dict(sample_id='s',outcome_label=1,outbreak_group_id='g',split='train',study_design='prospective',prediction_utc=time(10),label_policy_version='review-1',mode_available_utc=time(40),convective_mode='DISCRETE_RM',label_id='l',label_reviewed=True,reference_utc=time(30),control_coverage_evidence=None)],
   'sample_profile_links':[dict(sample_id='s',feature_id='f',selected=True)],
   'sample_radar_links':[dict(sample_id='s',volume_id='r',selected=True,range_available_utc=time(40),radar_to_storm_range_km=30.)]
  }
  self.rows['profile_features'][0]['srh_0_500m']=120.
 def tearDown(self):self.temp.cleanup()
 def connect(self):
  c=duckdb.connect()
  try:
   for schema,table in TABLES:
    row=self.rows[table][0]; columns=[]
    for key,value in row.items():
     typ='TIMESTAMPTZ' if key.endswith('_utc') else 'BOOLEAN' if isinstance(value,bool) else 'INTEGER' if key in ('lead_minutes','outcome_label') else 'DOUBLE' if key in PREDICTORS or key in ('stp_fixed','stp_effective','radar_to_storm_range_km') else 'VARCHAR'
     columns.append(f'{key} {typ}')
    c.execute(f'CREATE TABLE {table} ({",".join(columns)})')
    for item in self.rows[table]:c.execute(f'INSERT INTO {table} VALUES ({",".join("?" for _ in row)})',[item[k] for k in row])
    folder=self.root/schema;folder.mkdir(exist_ok=True)
    path=str(folder/(table+'.parquet')).replace("'","''")
    c.execute(f"COPY {table} TO '{path}' (FORMAT PARQUET)")
  finally:c.close()
  return connect_parquet(self.root)
 def test_actual_parquet_mart_and_allowlist(self):
  c=self.connect()
  try:
   rows=predictor_records(c);self.assertEqual(rows[0]['y'],1);self.assertEqual(rows[0]['X']['srh_0_500m'],120)
   self.assertIsNone(rows[0]['X']['mlcape_jkg']);self.assertNotIn('outcome_label',rows[0]['X'])
   self.assertEqual(c.execute('SELECT convective_mode,radar_to_storm_range_km FROM whirl_cases.guarded_research_mart').fetchone(),(None,None))
   with self.assertRaises(ValueError):predictor_records(c,['outcome_label'])
  finally:c.close()
 def test_control_anchor_and_retrospective_separation(self):
  s=self.rows['case_study_samples'][0];s.update(outcome_label=0,label_id=None,control_coverage_evidence='reviewed survey coverage',study_design='retrospective_label_anchored')
  c=self.connect()
  try:
   self.assertEqual(predictor_records(c),[])
   self.assertEqual(predictor_records(c,study_design='retrospective_label_anchored')[0]['y'],0)
  finally:c.close()
 def test_late_unknown_and_reanalysis_inputs_fail_closed(self):
  for table,field,value in [('vertical_profiles','operational_available_utc',time(11)),('vertical_profiles','availability_basis','unknown'),('vertical_profiles','availability_evidence',''),('vertical_profiles','source_type','REANALYSIS'),('profile_features','motion_available_utc',time(11)),('radar_volumes','volume_end_utc',time(11)),('radar_volumes','operational_available_utc',None),('case_study_samples','label_reviewed',False)]:
   with self.subTest(field=field,value=value):
    row=self.rows[table][0];old=row[field];row[field]=value
    c=self.connect()
    try:self.assertEqual(predictor_records(c),[])
    finally:c.close();row[field]=old
 def test_duplicates_and_split_leakage_rejected(self):
  self.rows['case_study_samples'].append(dict(self.rows['case_study_samples'][0],sample_id='s2',split='test'))
  with self.assertRaisesRegex(ValueError,'crosses'):self.connect()
  self.rows['case_study_samples'].pop()
  self.rows['sample_profile_links'].append(self.rows['sample_profile_links'][0].copy())
  with self.assertRaisesRegex(ValueError,'Duplicate'):self.connect()
 def test_mixed_versions_and_nonfinite_rejected(self):
  self.rows['profile_features'][0]['srh_0_500m']=float('inf')
  c=self.connect()
  try:
   with self.assertRaisesRegex(ValueError,'Nonfinite'):predictor_records(c)
  finally:c.close()

 def test_mixed_diagnostic_versions_require_explicit_selection(self):
  self.rows['case_study_samples'].append(dict(self.rows['case_study_samples'][0],sample_id='s2'))
  self.rows['profile_features'].append(dict(self.rows['profile_features'][0],feature_id='f2',algorithm_version='wind-next'))
  self.rows['sample_profile_links'].append(dict(sample_id='s2',feature_id='f2',selected=True))
  self.rows['sample_radar_links'].append(dict(self.rows['sample_radar_links'][0],sample_id='s2'))
  c=self.connect()
  try:
   with self.assertRaisesRegex(ValueError,'Mixed'):predictor_records(c)
   self.assertEqual(len(predictor_records(c,algorithm_version='wind-0.7')),1)
  finally:c.close()
