export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  model_name: string;
  framework: string;
  device: string;
  expected_input_size: [number, number];
  expected_output_shape: [number, number];
  error?: string | null;
}

export interface RegionalDensityItem {
  row: number;
  col: number;
  label: string;
  estimated_count: number;
  share_percent: number;
  mean_density: number;
}

export interface VerificationChecks {
  output_shape_valid: boolean;
  expected_output_shape: [number, number];
  actual_output_shape: [number, number];
  all_finite: boolean;
  all_non_negative: boolean;
  estimated_count_non_negative: boolean;
}

export interface ImageAnalysisResponse {
  status: string;
  filename: string;
  estimated_count: number;
  original_dimensions: { width: number; height: number };
  preprocessed_dimensions: { width: number; height: number };
  density_map_dimensions: { width: number; height: number };
  density_map_shape: [number, number];
  density_map_values: number[][];
  density_map_image: string;
  overlay_image: string;
  regional_breakdown: RegionalDensityItem[];
  top_region: RegionalDensityItem;
  lowest_region: RegionalDensityItem;
  inference_time_ms: number;
  verification: VerificationChecks;
}

export interface VideoJobCreateResponse {
  job_id: string;
  status: string;
  sampling_rate_fps: number;
  message: string;
}

export interface VideoJobStatusResponse {
  job_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  filename: string;
  progress_percent: number;
  processed_frames: number;
  total_sampled_frames: number;
  sampling_rate_fps: number;
  duration_sec: number;
  error?: string | null;
}

export interface VideoFrameResult {
  frame_index: number;
  timestamp_sec: number;
  estimated_count: number;
  inference_time_ms: number;
  density_map_image: string;
  overlay_image: string;
}

export interface VideoAnalysisResultsResponse {
  job_id: string;
  status: string;
  filename: string;
  sampling_rate_fps: number;
  duration_sec: number;
  sampled_frame_count: number;
  timestamps: number[];
  estimated_counts: number[];
  summary_statistics: {
    average_count: number;
    min_count: number;
    max_count: number;
    total_inference_time_ms: number;
  };
  frames: VideoFrameResult[];
  note: string;
}

export interface SubsetMetrics {
  Images: number;
  MAE: number;
  RMSE: number;
  "Mean Bias": number;
}

export interface ModelMetricsResponse {
  evaluation: {
    Overall: SubsetMetrics;
    "Part A": SubsetMetrics;
    "Part B": SubsetMetrics;
  };
  note: string;
}

export interface ModelConfigResponse {
  model_config_data: {
    model_name: string;
    task: string;
    framework: string;
    input_channels: number;
    input_width: number;
    input_height: number;
    output_channels: number;
    output_width: number;
    output_height: number;
    trainable_parameters: number;
    activation: string;
    best_epoch: number;
    best_validation_mae: number;
  };
  preprocessing: {
    input_color: string;
    input_resize: [number, number];
    input_pixel_range: [number, number];
    input_normalization: string;
    density_map_dimensions: [number, number];
    gaussian_sigma: number;
    density_map_interpolation: string;
    count_calculation: string;
  };
}

export interface TrainingEpochRow {
  epoch: number;
  train_loss: number;
  val_loss: number;
  val_mae: number;
  val_rmse: number;
  learning_rate: number;
}

export interface ErrorDistributionBin {
  range: string;
  total: number;
  part_a: number;
  part_b: number;
}

export interface ScatterPoint {
  label: string;
  subset: string;
  actual_count: number;
  predicted_count: number;
  absolute_error: number;
  prediction_bias: number;
}

export interface EvaluationDataResponse {
  total_test_rows: number;
  training_history: TrainingEpochRow[];
  error_distribution: ErrorDistributionBin[];
  scatter_points: ScatterPoint[];
  subset_summary: Record<
    string,
    {
      count: number;
      median_abs_error: number;
      p90_abs_error: number;
      max_actual_count: number;
      min_actual_count: number;
    }
  >;
}

export interface RiskThresholds {
  overallModerate: number;
  overallHigh: number;
  regionalModerate: number;
  regionalHigh: number;
}
