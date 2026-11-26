import base64
from io import BytesIO
from typing import Tuple

import cv2
import numpy as np
from PIL import Image


def _encode_png_data_url(bgr_or_rgb: np.ndarray, is_bgr: bool = True) -> str:
    """Encode an image numpy array as a base64 PNG data URL."""
    rgb = cv2.cvtColor(bgr_or_rgb, cv2.COLOR_BGR2RGB) if is_bgr else bgr_or_rgb
    pil_img = Image.fromarray(rgb)
    buffer = BytesIO()
    pil_img.save(buffer, format="PNG", optimize=True)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def _normalize_density_map(density_map: np.ndarray) -> np.ndarray:
    """Normalize a density map into uint8 [0, 255] preserving zero baseline."""
    arr = np.maximum(density_map.astype(np.float32), 0.0)
    max_val = float(arr.max())
    if max_val <= 1e-8:
        return np.zeros_like(arr, dtype=np.uint8)
    # Use 99.5th percentile or max so peaks remain bright and readable
    p_val = float(np.percentile(arr, 99.5))
    denom = max(p_val, max_val * 0.5, 1e-6)
    norm = np.clip(arr / denom, 0.0, 1.0)
    return (norm * 255.0).astype(np.uint8)


def render_density_visualizations(
    original_image: Image.Image,
    density_map: np.ndarray,
    preview_width: int = 512,
    preview_height: int = 384,
) -> Tuple[str, str]:
    """
    Create both:
    1) A standalone colorized density-map visualization PNG (data URL).
    2) A heatmap overlay blended onto the original RGB image PNG (data URL).
    """
    norm_u8 = _normalize_density_map(density_map)

    # Upscale normalized density smoothly before applying colormap for clean visual presentation
    density_resized = cv2.resize(
        norm_u8, (preview_width, preview_height), interpolation=cv2.INTER_CUBIC
    )
    heatmap_bgr = cv2.applyColorMap(density_resized, cv2.COLORMAP_TURBO)
    density_map_data_url = _encode_png_data_url(heatmap_bgr, is_bgr=True)

    # Build overlay matching original aspect ratio (bounded for fast transfer)
    orig_w, orig_h = original_image.size
    max_dim = 960
    scale = min(1.0, max_dim / max(orig_w, orig_h))
    target_w = max(64, int(round(orig_w * scale)))
    target_h = max(64, int(round(orig_h * scale)))

    orig_rgb = np.asarray(original_image.convert("RGB").resize((target_w, target_h), Image.Resampling.BILINEAR))
    orig_bgr = cv2.cvtColor(orig_rgb, cv2.COLOR_RGB2BGR)

    overlay_heat_u8 = cv2.resize(norm_u8, (target_w, target_h), interpolation=cv2.INTER_CUBIC)
    overlay_heat_bgr = cv2.applyColorMap(overlay_heat_u8, cv2.COLORMAP_TURBO)

    # Spatially varying alpha: stronger where density is present, subtle in empty regions
    alpha_map = np.clip((overlay_heat_u8.astype(np.float32) / 255.0) * 0.65 + 0.12, 0.12, 0.72)
    alpha_3c = np.repeat(alpha_map[:, :, np.newaxis], 3, axis=2)

    blended_bgr = (
        orig_bgr.astype(np.float32) * (1.0 - alpha_3c)
        + overlay_heat_bgr.astype(np.float32) * alpha_3c
    )
    blended_bgr = np.clip(blended_bgr, 0, 255).astype(np.uint8)
    overlay_data_url = _encode_png_data_url(blended_bgr, is_bgr=True)

    return density_map_data_url, overlay_data_url
