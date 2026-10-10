-- WHIRL research schema v0.7. Apply once to a new research database.
-- These tables separate labels, source data and versioned transformations.
BEGIN;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE SCHEMA whirl_labels;
CREATE SCHEMA whirl_inputs;
CREATE SCHEMA whirl_cases;

CREATE TABLE whirl_labels.tornado_ground_truth (
    label_id text PRIMARY KEY,
    event_id text NOT NULL, -- Internal reconciled event identity, not a provider ID.
    source text NOT NULL CHECK (source IN ('SPC_WCM','NCEI_STORM_DATA','NWS_DAT')),
    source_event_id text NOT NULL,
    source_revision text NOT NULL,
    source_uri text NOT NULL,
    retrieved_utc timestamptz NOT NULL,
    reviewed_utc timestamptz,
    touchdown_utc timestamptz NOT NULL,
    liftoff_utc timestamptz CHECK (liftoff_utc >= touchdown_utc),
    rating_scale text CHECK (rating_scale IN ('F','EF','UNKNOWN')),
    rating smallint CHECK (rating BETWEEN 0 AND 5),
    rating_method text, -- Preserve provider flags verbatim; do not infer meaning.
    source_flags jsonb NOT NULL DEFAULT '{}',
    path_length_km double precision CHECK (path_length_km >= 0),
    max_width_m double precision CHECK (max_width_m >= 0),
    track_geom geometry(Geometry,4326),
    touchdown_point geometry(Point,4326), -- Source-reported endpoint, NEVER polygon vertex.
    geometry_quality text NOT NULL CHECK (geometry_quality IN ('survey','reported_endpoints','approximate','missing')),
    UNIQUE (source,source_event_id,source_revision),
    CHECK (rating IS NULL OR (rating_scale IS NOT NULL AND rating_scale IN ('F','EF'))),
    CHECK (reviewed_utc IS NULL OR reviewed_utc >= retrieved_utc),
    CHECK (track_geom IS NULL OR (NOT ST_IsEmpty(track_geom) AND ST_IsValid(track_geom)
        AND GeometryType(track_geom) IN ('LINESTRING','MULTILINESTRING','POLYGON','MULTIPOLYGON'))),
    CHECK (touchdown_point IS NULL OR NOT ST_IsEmpty(touchdown_point))
);
CREATE INDEX ground_truth_time ON whirl_labels.tornado_ground_truth(touchdown_utc);
CREATE INDEX ground_truth_geom ON whirl_labels.tornado_ground_truth USING gist(track_geom);
CREATE INDEX ground_truth_touchdown ON whirl_labels.tornado_ground_truth USING gist(touchdown_point);

CREATE TABLE whirl_inputs.vertical_profiles (
    profile_id text PRIMARY KEY,
    source_type text NOT NULL CHECK (source_type IN ('MODEL_FORECAST','MODEL_ANALYSIS','RAOB','REANALYSIS')),
    source_name text NOT NULL,
    source_version text NOT NULL,
    station_or_grid_id text NOT NULL,
    init_utc timestamptz,
    valid_utc timestamptz NOT NULL,
    lead_minutes integer,
    observation_end_utc timestamptz,
    operational_available_utc timestamptz, -- Historical availability, NOT archive download time.
    availability_basis text NOT NULL CHECK (availability_basis IN ('recorded','documented','unknown')),
    availability_evidence text,
    retrieved_utc timestamptz NOT NULL,
    raw_object_uri text NOT NULL,
    content_sha256 text CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
    location_geom geometry(Point,4326) NOT NULL CHECK (NOT ST_IsEmpty(location_geom)),
    qc_flags jsonb NOT NULL DEFAULT '{}',
    CHECK ((availability_basis='unknown' AND operational_available_utc IS NULL)
        OR (availability_basis<>'unknown' AND operational_available_utc IS NOT NULL AND availability_evidence IS NOT NULL)),
    CHECK ((source_type IN ('MODEL_FORECAST','MODEL_ANALYSIS','REANALYSIS') AND init_utc IS NOT NULL
        AND lead_minutes IS NOT NULL AND lead_minutes >= 0
        AND valid_utc=init_utc + lead_minutes * interval '1 minute')
        OR (source_type='RAOB' AND init_utc IS NULL AND lead_minutes IS NULL AND observation_end_utc IS NOT NULL)),
    CHECK (source_type<>'MODEL_ANALYSIS' OR lead_minutes=0),
    CHECK (source_type<>'RAOB' OR observation_end_utc>=valid_utc),
    CHECK (operational_available_utc IS NULL OR operational_available_utc>=COALESCE(observation_end_utc,init_utc))
);
CREATE INDEX profile_valid ON whirl_inputs.vertical_profiles(valid_utc);
CREATE INDEX profile_available ON whirl_inputs.vertical_profiles(operational_available_utc);
CREATE INDEX profile_location ON whirl_inputs.vertical_profiles USING gist(location_geom);

CREATE TABLE whirl_inputs.profile_features (
    feature_id text PRIMARY KEY,
    profile_id text NOT NULL REFERENCES whirl_inputs.vertical_profiles(profile_id),
    algorithm_version text NOT NULL,
    parcel_definition text NOT NULL, -- e.g. lowest-100-hPa mixed layer; AGL convention explicit.
    storm_motion_method text NOT NULL CHECK (storm_motion_method IN ('bunkers_rm','bunkers_lm','observed','user_declared')),
    storm_motion_u_ms double precision NOT NULL,
    storm_motion_v_ms double precision NOT NULL,
    motion_available_utc timestamptz, -- Unknown motion availability fails mart guard.
    motion_evidence text,
    computed_utc timestamptz NOT NULL, -- Retrospective deterministic calculation is permitted.
    srh_0_500m double precision,
    srh_0_1km double precision,
    srh_0_3km double precision,
    srh_1_3km double precision,
    effective_srh double precision,
    shear_0_1km_ms double precision CHECK (shear_0_1km_ms >= 0),
    shear_0_6km_ms double precision CHECK (shear_0_6km_ms >= 0),
    effective_shear_ms double precision CHECK (effective_shear_ms >= 0),
    streamwise_fraction_0_500m double precision CHECK (streamwise_fraction_0_500m BETWEEN -1 AND 1),
    mlcape_jkg double precision CHECK (mlcape_jkg >= 0),
    sbcape_jkg double precision CHECK (sbcape_jkg >= 0),
    cape_0_3km_jkg double precision CHECK (cape_0_3km_jkg >= 0),
    mlcin_jkg double precision CHECK (mlcin_jkg <= 0),
    ml_lcl_agl_m double precision CHECK (ml_lcl_agl_m >= 0),
    subcloud_mean_dewpoint_depression_c double precision CHECK (subcloud_mean_dewpoint_depression_c >= 0),
    moisture_proxy_definition text,
    stp_fixed double precision,
    stp_effective double precision,
    qc_flags jsonb NOT NULL DEFAULT '{}',
    UNIQUE (profile_id,algorithm_version,storm_motion_method,storm_motion_u_ms,storm_motion_v_ms),
    CHECK (motion_available_utc IS NULL OR motion_evidence IS NOT NULL)
);
-- WHIRL weights/scores intentionally absent: they require a versioned model artifact
-- and fitted-on group IDs; they must never be silently substituted for physical features.

CREATE TABLE whirl_inputs.radar_volumes (
    volume_id text PRIMARY KEY,
    provider text NOT NULL CHECK (provider IN ('AWS','GCS','OTHER')),
    archive_bucket text NOT NULL,
    object_key text NOT NULL,
    archive_member text, -- Needed when GCS object is an hourly TAR archive.
    radar_site text NOT NULL CHECK (radar_site ~ '^[A-Z][A-Z0-9]{3}$'),
    volume_start_utc timestamptz NOT NULL,
    volume_end_utc timestamptz CHECK (volume_end_utc >= volume_start_utc),
    operational_available_utc timestamptz,
    availability_basis text NOT NULL CHECK (availability_basis IN ('recorded','documented','unknown')),
    availability_evidence text,
    retrieved_utc timestamptz NOT NULL,
    vcp smallint CHECK (vcp > 0),
    is_super_res boolean, -- NULL means unverified/unknown, never default TRUE.
    has_dual_pol boolean,
    object_uri text NOT NULL,
    content_sha256 text CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
    qc_flags jsonb NOT NULL DEFAULT '{}',
    UNIQUE (object_uri),
    CHECK ((availability_basis='unknown' AND operational_available_utc IS NULL)
        OR (availability_basis<>'unknown' AND operational_available_utc IS NOT NULL AND availability_evidence IS NOT NULL)),
    CHECK (operational_available_utc IS NULL OR (volume_end_utc IS NOT NULL AND operational_available_utc>=volume_end_utc))
);
CREATE INDEX radar_site_time ON whirl_inputs.radar_volumes(radar_site,volume_start_utc);

CREATE TABLE whirl_cases.case_study_samples (
    sample_id text PRIMARY KEY,
    outcome_label smallint CHECK (outcome_label IN (0,1)), -- NULL = unresolved, not a control.
    label_id text REFERENCES whirl_labels.tornado_ground_truth(label_id),
    label_reviewed boolean NOT NULL DEFAULT false,
    label_policy_version text NOT NULL,
    prediction_utc timestamptz NOT NULL,
    reference_utc timestamptz NOT NULL, -- Touchdown for positives; declared anchor for controls.
    reference_policy text NOT NULL,
    study_design text NOT NULL CHECK (study_design IN ('prospective','retrospective_label_anchored')),
    outcome_window_end_utc timestamptz NOT NULL,
    control_coverage_evidence text,
    outbreak_group_id text NOT NULL, -- One event/day group cannot span train/test.
    split text NOT NULL CHECK (split IN ('train','validation','test','unassigned')) DEFAULT 'unassigned',
    convective_mode text CHECK (convective_mode IN ('DISCRETE_RM','DISCRETE_LM','QLCS','CLUSTER','UNCERTAIN')),
    mode_available_utc timestamptz, -- Retrospective mode is stratification only.
    sampling_location geometry(Point,4326), -- Not exported as a predictive feature.
    selection_policy_version text NOT NULL,
    CHECK (prediction_utc <= reference_utc AND outcome_window_end_utc >= reference_utc),
    CHECK ((outcome_label=1 AND label_id IS NOT NULL)
        OR (outcome_label=0 AND label_id IS NULL AND control_coverage_evidence IS NOT NULL)
        OR outcome_label IS NULL)
);
CREATE INDEX sample_prediction ON whirl_cases.case_study_samples(prediction_utc);
CREATE INDEX sample_location ON whirl_cases.case_study_samples USING gist(sampling_location);
CREATE INDEX sample_group ON whirl_cases.case_study_samples(outbreak_group_id);

-- Many candidates per sample and many samples per input. A selected candidate
-- remains a relationship, not a duplicate of raw profile/volume metadata.
CREATE TABLE whirl_cases.sample_profile_links (
    sample_id text NOT NULL REFERENCES whirl_cases.case_study_samples(sample_id),
    feature_id text NOT NULL REFERENCES whirl_inputs.profile_features(feature_id),
    selected boolean NOT NULL DEFAULT false,
    matching_version text NOT NULL,
    distance_km double precision CHECK (distance_km >= 0),
    inflow_sector_basis text,
    PRIMARY KEY (sample_id,feature_id)
);
CREATE UNIQUE INDEX one_selected_profile ON whirl_cases.sample_profile_links(sample_id) WHERE selected;
CREATE TABLE whirl_cases.sample_radar_links (
    sample_id text NOT NULL REFERENCES whirl_cases.case_study_samples(sample_id),
    volume_id text NOT NULL REFERENCES whirl_inputs.radar_volumes(volume_id),
    selected boolean NOT NULL DEFAULT false,
    matching_version text NOT NULL,
    radar_to_storm_range_km double precision CHECK (radar_to_storm_range_km >= 0),
    range_available_utc timestamptz,
    beam_height_agl_m double precision,
    sweep_index integer CHECK (sweep_index >= 0),
    blockage_flag boolean,
    PRIMARY KEY (sample_id,volume_id)
);
CREATE UNIQUE INDEX one_selected_radar ON whirl_cases.sample_radar_links(sample_id) WHERE selected;
COMMIT;
