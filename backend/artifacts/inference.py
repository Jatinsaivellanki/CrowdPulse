
import torch
import torch.nn as nn
import numpy as np

from PIL import Image


class CrowdPulseCNN(nn.Module):

    def __init__(self):
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
            nn.ReLU(inplace=True)
        )

        self.decoder = nn.Sequential(
            nn.Conv2d(128, 64, 3, padding=1),
            nn.ReLU(inplace=True),

            nn.Conv2d(64, 32, 3, padding=1),
            nn.ReLU(inplace=True),

            nn.Conv2d(32, 1, 1)
        )

        self.activation = nn.Softplus()

    def forward(self, x):
        features = self.encoder(x)
        density = self.decoder(features)
        return self.activation(density)


class CrowdPulsePredictor:

    def __init__(self, model_path, device=None):

        self.device = torch.device(
            device or (
                "cuda" if torch.cuda.is_available()
                else "cpu"
            )
        )

        self.model = CrowdPulseCNN().to(self.device)

        state = torch.load(
            model_path,
            map_location=self.device,
            weights_only=True
        )

        self.model.load_state_dict(state)
        self.model.eval()

    def predict(self, image):

        if isinstance(image, str):
            image = Image.open(image)

        image = image.convert("RGB")

        resized = image.resize(
            (256, 192),
            Image.Resampling.BILINEAR
        )

        array = np.asarray(
            resized,
            dtype=np.float32
        ) / 255.0

        tensor = torch.from_numpy(
            array.transpose(2, 0, 1)
        ).unsqueeze(0).to(self.device)

        with torch.no_grad():
            density = self.model(tensor)

        density_map = density[0, 0].cpu().numpy()

        estimated_count = float(density_map.sum())

        return {
            "estimated_count": estimated_count,
            "density_map": density_map,
            "density_shape": density_map.shape
        }
