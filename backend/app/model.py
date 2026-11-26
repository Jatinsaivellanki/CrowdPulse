import json
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import torch
import torch.nn as nn


ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "artifacts"


class CrowdPulseCNN(nn.Module):
    """Supervised CNN for crowd density-map regression matching CrowdPulse_Artifacts/inference.py."""

    def __init__(self) -> None:
        super().__init__()

        self.encoder = nn.Sequential(
            nn.Conv2d(3, 32, 3, padding=1),
            nn.ReLU(inplace=True),
            nn.Conv2d(32, 32, 3, padding=1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1),
            nn.ReLU(inplace=True),
            nn.Conv2d(64, 64, 3, padding=1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Conv2d(64, 128, 3, padding=1),
            nn.ReLU(inplace=True),
            nn.Conv2d(128, 128, 3, padding=1),
            nn.ReLU(inplace=True),
        )

        self.decoder = nn.Sequential(
            nn.Conv2d(128, 64, 3, padding=1),
            nn.ReLU(inplace=True),
            nn.Conv2d(64, 32, 3, padding=1),
            nn.ReLU(inplace=True),
            nn.Conv2d(32, 1, 1),
        )

        self.activation = nn.Softplus()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        features = self.encoder(x)
        density = self.decoder(features)
        return self.activation(density)


class ModelRegistry:
    """Singleton-style container holding the loaded PyTorch model and artifact metadata."""

    def __init__(self, artifacts_dir: Path = ARTIFACTS_DIR) -> None:
        self.artifacts_dir = artifacts_dir
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model: Optional[CrowdPulseCNN] = None
        self.model_loaded: bool = False
        self.load_error: Optional[str] = None
        self.model_config: Dict[str, Any] = {}
        self.preprocessing: Dict[str, Any] = {}
        self.evaluation: Dict[str, Any] = {}

    def load(self) -> None:
        """Load configuration files and PyTorch weights once at application startup."""
        try:
            config_path = self.artifacts_dir / "model_config.json"
            preproc_path = self.artifacts_dir / "preprocessing.json"
            eval_path = self.artifacts_dir / "evaluation.json"
            weights_path = self.artifacts_dir / "crowdpulse_cnn.pth"

            with config_path.open("r", encoding="utf-8") as f:
                self.model_config = json.load(f)

            with preproc_path.open("r", encoding="utf-8") as f:
                self.preprocessing = json.load(f)

            with eval_path.open("r", encoding="utf-8") as f:
                self.evaluation = json.load(f)

            if not weights_path.exists():
                raise FileNotFoundError(f"Model weights not found at {weights_path.name}")

            model = CrowdPulseCNN().to(self.device)
            state = torch.load(weights_path, map_location=self.device, weights_only=True)
            model.load_state_dict(state)
            model.eval()

            self.model = model
            self.model_loaded = True
            self.load_error = None
        except Exception as exc:  # noqa: BLE001
            self.model = None
            self.model_loaded = False
            self.load_error = f"Failed to load CrowdPulse model: {exc}"

    @property
    def expected_input_size(self) -> Tuple[int, int]:
        """Return (width, height) expected by preprocessing."""
        resize = self.preprocessing.get("input_resize", [256, 192])
        return int(resize[0]), int(resize[1])

    @property
    def expected_output_shape(self) -> Tuple[int, int]:
        """Return (height, width) of the output density map tensor."""
        out_h = int(self.model_config.get("output_height", 48))
        out_w = int(self.model_config.get("output_width", 64))
        return out_h, out_w
