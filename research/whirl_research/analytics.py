"""Parquet-to-DuckDB mart with explicit predictors/targets and group-split guard."""
from pathlib import Path
import math

TABLES = (
 ('whirl_labels','tornado_ground_truth'),
 ('whirl_inputs','vertical_profiles'),('whirl_inputs','profile_features'),('whirl_inputs','radar_volumes'),
 ('whirl_cases','case_study_samples'),('whirl_cases','sample_profile_links'),('whirl_cases','sample_radar_links'),
)
PREDICTORS = ('srh_0_500m','srh_0_1km','srh_0_3km','srh_1_3km','effective_srh',
              'streamwise_fraction_0_500m','shear_0_1km_ms','shear_0_6km_ms','effective_shear_ms',
              'mlcape_jkg','sbcape_jkg','cape_0_3km_jkg','mlcin_jkg','ml_lcl_agl_m',
              'subcloud_mean_dewpoint_depression_c')


def connect_parquet(directory, database=':memory:'):
    import duckdb
    con = duckdb.connect(str(database))
    try:
        for schema in {s for s,_ in TABLES}:
            con.execute(f'CREATE SCHEMA IF NOT EXISTS {schema}')
        for schema, table in TABLES:
            path = Path(directory)/schema/(table+'.parquet')
            if not path.is_file():
                raise FileNotFoundError(path)
            # Only fixed identifiers; quote the filename as SQL data, not shell text.
            literal = str(path.resolve()).replace("'", "''")
            con.execute(f"CREATE OR REPLACE VIEW {schema}.{table} AS SELECT * FROM read_parquet('{literal}')")
        con.execute((Path(__file__).parents[1]/'sql/002_guarded_mart.sql').read_text())
        assert_catalog_integrity(con)
        return con
    except Exception:
        con.close()
        raise


def assert_catalog_integrity(con):
    keys = { 'tornado_ground_truth':'label_id','vertical_profiles':'profile_id','profile_features':'feature_id',
             'radar_volumes':'volume_id','case_study_samples':'sample_id'}
    for schema,table in TABLES:
        if table in keys:
            key=keys[table]
            count=con.execute(f'SELECT count(*) FROM (SELECT {key} FROM {schema}.{table} GROUP BY {key} HAVING count(*)<>1 OR {key} IS NULL)').fetchone()[0]
            if count:raise ValueError(f'Duplicate/null identity in {table}')
    for table,key in [('sample_profile_links','feature_id'),('sample_radar_links','volume_id')]:
        count=con.execute(f'SELECT count(*) FROM (SELECT sample_id,{key} FROM whirl_cases.{table} GROUP BY sample_id,{key} HAVING count(*)>1)').fetchone()[0]
        if count:raise ValueError(f'Duplicate associations in {table}')
        count=con.execute(f'SELECT count(*) FROM (SELECT sample_id FROM whirl_cases.{table} WHERE selected GROUP BY sample_id HAVING count(*)>1)').fetchone()[0]
        if count:raise ValueError(f'Multiple selected inputs in {table}')
    count=con.execute('''SELECT count(*) FROM (
        SELECT outbreak_group_id FROM whirl_cases.case_study_samples
        WHERE split<>'unassigned' GROUP BY outbreak_group_id HAVING count(DISTINCT split)>1
    )''').fetchone()[0]
    if count:raise ValueError('Outbreak group crosses train/validation/test split')
    count=con.execute("SELECT count(*) FROM whirl_cases.case_study_samples WHERE outbreak_group_id IS NULL OR length(trim(outbreak_group_id))=0 OR split NOT IN ('train','validation','test','unassigned') OR prediction_utc>reference_utc").fetchone()[0]
    if count:raise ValueError('Invalid group, split or prediction/reference ordering')


def predictor_records(con, feature_columns=PREDICTORS, study_design='prospective',
                      algorithm_version=None, source_version=None):
    """Fail closed on outcome-derived predictors, invalid numerics and mixed versions.

    Unknown values remain None; imputation, normalization and fitting must be
    learned on TRAIN groups only by a separately versioned model pipeline.
    """
    if study_design not in ('prospective','retrospective_label_anchored'):
        raise ValueError('Explicit valid study design required')
    columns=tuple(feature_columns)
    if not columns or any(c not in PREDICTORS for c in columns) or len(set(columns))!=len(columns):
        raise ValueError('Only unique allowlisted physical predictors permitted')
    assert_catalog_integrity(con)
    cursor=con.execute('SELECT * FROM whirl_cases.guarded_research_mart WHERE study_design=? ORDER BY sample_id',[study_design])
    rows=[dict(zip([d[0] for d in cursor.description],r)) for r in cursor.fetchall()]
    if algorithm_version is not None:rows=[r for r in rows if r['algorithm_version']==algorithm_version]
    if source_version is not None:rows=[r for r in rows if r['source_version']==source_version]
    version_keys={(r['source_name'],r['source_version'],r['algorithm_version'],r['parcel_definition'],r['storm_motion_method'],r['label_policy_version']) for r in rows}
    if len(version_keys)>1:
        raise ValueError('Mixed source/diagnostic/motion/label definitions: select or stratify explicitly')
    result=[]
    for row in rows:
        values={key:row[key] for key in columns}
        if any(v is not None and not math.isfinite(v) for v in values.values()):
            raise ValueError('Nonfinite predictor values require explicit QC')
        result.append({'sample_id':row['sample_id'],'X':values,'y':row['outcome_label'],
                       'group':row['outbreak_group_id'],'split':row['split'],
                       'study_design':row['study_design'], 'algorithm_version':row['algorithm_version']})
    return result
