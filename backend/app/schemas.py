from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_name: str
    framework: str
    device: str
    expected_input_size: List[int]
    expected_output_shape: List[int]
    error: Optional[str] = None


class RegionalDensityItem(BaseModel):
    row: int
    col: int
    label: str
    estimated_count: float
    share_percent: float
    mean_density: float


class VerificationChecks(BaseModel):
    output_shape_valid: bool
    expected_output_shape: List[int]
    actual_output_shape: List[int]
    all_finite: bool
    all_non_negative: bool
    estimated_count_non_negative: bool


class ImageAnalysisResponse(BaseModel):
    status: str
    filename: str
    estimated_count: float
    original_dimensions: Dict[str, int]
    preprocessed_dimensions: Dict[str, int]
    density_map_dimensions: Dict[str, int]
    density_map_shape: List[int]
    density_map_values: List[List[float]]
    density_map_image: str
    overlay_image: str
    regional_breakdown: List[RegionalDensityItem]
    top_region: RegionalDensityItem
    lowest_region: RegionalDensityItem
    inference_time_ms: float
    verification: VerificationChecks


class VideoJobCreateResponse(BaseModel):
    job_id: str
    status: str
    sampling_rate_fps: float
    message: str


class VideoJobStatusResponse(BaseModel):
    job_id: str
    status: str
    filename: str
    progress_percent: float
    processed_frames: int
    total_sampled_frames: int
    sampling_rate_fps: float
    duration_sec: float
    error: Optional[str] = None


class VideoFrameResult(BaseModel):
    frame_index: int
    timestamp_sec: float
    estimated_count: float
    inference_time_ms: float
    density_map_image: str
    overlay_image: str


class VideoSummaryStatistics(BaseModel):
    average_count: float
    min_count: float
    max_count: float
    total_inference_time_ms: float


class VideoAnalysisResultsResponse(BaseModel):
    job_id: str
    status: str
    filename: str
    sampling_rate_fps: float
    duration_sec: float
    sampled_frame_count: int
    timestamps: List[float]
    estimated_counts: List[float]
    summary_statistics: VideoSummaryStatistics
    frames: List[VideoFrameResult]
    note: str = Field(
        default=(
            "Each sampled frame is evaluated independently by the CNN. "
            "Counts across frames must not be summed as unique visitors, and individual people are not tracked."
        )
    )


class ModelConfigResponse(BaseModel):
    model_config_data: Dict[str, Any]
    preprocessing: Dict[str, Any]


class ModelMetricsResponse(BaseModel):
    evaluation: Dict[str, Any]
    note: str
