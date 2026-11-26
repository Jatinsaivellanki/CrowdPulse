import time
from typing import Any, Dict, List

import numpy as np
import torch
from PIL import Image

from app.model import ModelRegistry
from app.schemas import RegionalDensityItem, VerificationChecks
from app.visualization import render_density_visualizations


ROW_NAMES = ["Top", "Middle", "Bottom"]
COL_NAMES = ["Left", "Center", "Right"]


def compute_regional_breakdown(density_map: np.ndarray) -> List[RegionalDensityItem]:
    """
    Partition the 48x64 density map into a 3x3 grid and sum each cell's values.
    Using np.array_split guarantees the 9 regions sum exactly to the total estimated count.
    """
    total_count = float(density_map.sum())
    row_bands = np.array_split(density_map, 3, axis=0)
    regions: List[RegionalDensityItem] = []

    for r_idx, r_band in enumerate(row_bands):
        col_cells = np.array_split(r_band, 3, axis=1)
        for c_idx, cell in enumerate(col_cells):
            cell_sum = float(cell.sum())
            share = (cell_sum / total_count * 100.0) if total_count > 1e-8 else 0.0
            regions.append(
                RegionalDensityItem(
                    row=r_idx,
                    col=c_idx,
                    label=f"{ROW_NAMES[r_idx]}-{COL_NAMES[c_idx]}",
                    estimated_count=round(cell_sum, 4),
                    share_percent=round(share, 2),
                    mean_density=round(float(cell.mean()), 6),
                )
            )
    return regions


def run_image_inference(
    registry: ModelRegistry,
    image: Image.Image,
    filename: str = "uploaded_image",
    include_density_values: bool = True,
) -> Dict[str, Any]:
    """Run exact CrowdPulseCNN preprocessing, inference, verification, and visualization."""
    if not registry.model_loaded or registry.model is None:
        raise RuntimeError(registry.load_error or "CrowdPulse model is not loaded.")

    rgb_image = image.convert("RGB")
    orig_w, orig_h = rgb_image.size
    in_w, in_h = registry.expected_input_size  # (256, 192)
    exp_h, exp_w = registry.expected_output_shape  # (48, 64)

    t0 = time.perf_counter()

    resized = rgb_image.resize((in_w, in_h), Image.Resampling.BILINEAR)
    array = np.asarray(resized, dtype=np.float32) / 255.0
    tensor = torch.from_numpy(array.transpose(2, 0, 1)).unsqueeze(0).to(registry.device)

    with torch.no_grad():
        density_tensor = registry.model(tensor)

    if registry.device.type == "cuda":
        torch.cuda.synchronize()

    inference_time_ms = (time.perf_counter() - t0) * 1000.0

    density_map = density_tensor[0, 0].detach().cpu().numpy().astype(np.float32)
    estimated_count = float(density_map.sum())

    actual_shape = list(density_map.shape)
    all_finite = bool(np.isfinite(density_map).all())
    all_non_negative = bool((density_map >= 0.0).all())
    shape_valid = actual_shape == [exp_h, exp_w]

    verification = VerificationChecks(
        output_shape_valid=shape_valid,
        expected_output_shape=[exp_h, exp_w],
        actual_output_shape=actual_shape,
        all_finite=all_finite,
        all_non_negative=all_non_negative,
        estimated_count_non_negative=estimated_count >= 0.0,
    )

    density_map_img, overlay_img = render_density_visualizations(rgb_image, density_map)
    regions = compute_regional_breakdown(density_map)
    top_region = max(regions, key=lambda r: r.estimated_count)
    lowest_region = min(regions, key=lambda r: r.estimated_count)

    return {
        "status": "success",
        "filename": filename,
        "estimated_count": round(estimated_count, 3),
        "original_dimensions": {"width": orig_w, "height": orig_h},
        "preprocessed_dimensions": {"width": in_w, "height": in_h},
        "density_map_dimensions": {"width": actual_shape[1], "height": actual_shape[0]},
        "density_map_shape": actual_shape,
        "density_map_values": (
            np.round(density_map, 6).tolist() if include_density_values else []
        ),
        "density_map_image": density_map_img,
        "overlay_image": overlay_img,
        "regional_breakdown": regions,
        "top_region": top_region,
        "lowest_region": lowest_region,
        "inference_time_ms": round(inference_time_ms, 2),
        "verification": verification,
    }
