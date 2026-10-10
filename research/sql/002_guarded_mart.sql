-- Same SELECT is used by PostgreSQL and DuckDB (schemas mirrored from Parquet).
-- Outcome/group metadata are targets/split keys, NEVER columns in X.
CREATE OR REPLACE VIEW whirl_cases.guarded_research_mart AS
SELECT
 s.sample_id, s.outcome_label, s.outbreak_group_id, s.split, s.study_design,
 s.prediction_utc, s.label_policy_version, p.source_name, p.source_version,
 f.algorithm_version, f.parcel_definition, f.storm_motion_method,
 CASE WHEN s.mode_available_utc<=s.prediction_utc THEN s.convective_mode ELSE NULL END AS convective_mode,
 CASE WHEN rl.range_available_utc<=s.prediction_utc THEN rl.radar_to_storm_range_km ELSE NULL END AS radar_to_storm_range_km,
 f.srh_0_500m, f.srh_0_1km, f.srh_0_3km, f.srh_1_3km, f.effective_srh, f.streamwise_fraction_0_500m,
 f.shear_0_1km_ms, f.shear_0_6km_ms, f.effective_shear_ms,
 f.mlcape_jkg, f.sbcape_jkg, f.cape_0_3km_jkg, f.mlcin_jkg, f.ml_lcl_agl_m,
 f.subcloud_mean_dewpoint_depression_c, f.stp_fixed, f.stp_effective
FROM whirl_cases.case_study_samples s
JOIN whirl_cases.sample_profile_links pl ON pl.sample_id=s.sample_id AND pl.selected
JOIN whirl_inputs.profile_features f ON f.feature_id=pl.feature_id
JOIN whirl_inputs.vertical_profiles p ON p.profile_id=f.profile_id
JOIN whirl_cases.sample_radar_links rl ON rl.sample_id=s.sample_id AND rl.selected
JOIN whirl_inputs.radar_volumes r ON r.volume_id=rl.volume_id
LEFT JOIN whirl_labels.tornado_ground_truth label ON label.label_id=s.label_id
WHERE s.outcome_label IN (0,1) AND s.label_reviewed
 AND ((s.outcome_label=1 AND label.reviewed_utc IS NOT NULL AND s.reference_utc=label.touchdown_utc)
   OR (s.outcome_label=0 AND s.label_id IS NULL AND length(trim(s.control_coverage_evidence))>0))
 AND p.source_type IN ('MODEL_FORECAST','MODEL_ANALYSIS','RAOB') -- Reanalysis is descriptive only.
 AND p.availability_basis IN ('recorded','documented')
 AND length(trim(p.availability_evidence))>0
 AND s.prediction_utc<=s.reference_utc
 AND p.operational_available_utc>=COALESCE(p.observation_end_utc,p.init_utc)
 AND ((p.source_type IN ('MODEL_FORECAST','MODEL_ANALYSIS') AND p.lead_minutes>=0
   AND p.valid_utc=p.init_utc+p.lead_minutes*INTERVAL '1 minute'
   AND (p.source_type<>'MODEL_ANALYSIS' OR p.lead_minutes=0))
   OR (p.source_type='RAOB' AND p.observation_end_utc>=p.valid_utc))
 AND p.operational_available_utc<=s.prediction_utc
 AND (p.source_type='MODEL_FORECAST' OR p.valid_utc<=s.prediction_utc)
 AND (p.source_type<>'RAOB' OR p.observation_end_utc<=s.prediction_utc)
 AND length(trim(f.motion_evidence))>0
 AND f.motion_available_utc<=s.prediction_utc
 AND r.availability_basis IN ('recorded','documented')
 AND length(trim(r.availability_evidence))>0
 AND r.volume_start_utc<=r.volume_end_utc
 AND r.operational_available_utc>=r.volume_end_utc
 AND r.operational_available_utc<=s.prediction_utc
 AND r.volume_end_utc<=s.prediction_utc
 AND r.volume_end_utc<=s.reference_utc
 AND EXTRACT(EPOCH FROM (s.reference_utc-r.volume_end_utc))/60.0 BETWEEN 10 AND 30;
-- The 10–30-minute window is a declared research sampling policy, NOT a physical threshold.
