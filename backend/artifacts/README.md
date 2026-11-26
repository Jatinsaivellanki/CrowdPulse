# CrowdPulse - CNN Model Artifacts

## Project
CrowdPulse is a supervised crowd density estimation system.

## Model
- Architecture: Custom CNN
- Framework: PyTorch
- Task: Density map regression
- Input: RGB image, 256 x 192
- Output: Density map, 48 x 64
- Estimated count: Sum of density map values
- Dataset: ShanghaiTech Part A and Part B

## Evaluation

Official test set:
- Total images: 2,988
- Overall MAE: 65.665
- Overall RMSE: 123.247
- Part A MAE: 129.577
- Part A RMSE: 195.125
- Part B MAE: 28.855
- Part B RMSE: 44.830

These are results from the specific training run.
Performance differs substantially between Part A and Part B.

## Files

- crowdpulse_cnn.pth: Trained model weights
- model_config.json: Model architecture configuration
- preprocessing.json: Input preprocessing configuration
- inference.py: Model architecture and inference implementation
- evaluation.json: Official test evaluation metrics
- training_history.csv: Epoch-wise training results
- test_predictions.csv: Individual official test predictions
- evaluation_plots/: Training and evaluation plots
- sample_predictions/: Example prediction visualizations

## Basic inference

    from inference import CrowdPulsePredictor

    predictor = CrowdPulsePredictor("crowdpulse_cnn.pth")

    result = predictor.predict("crowd.jpg")

    print(result["estimated_count"])

    density_map = result["density_map"]

## Important limitations

- This model estimates crowd counts from individual images.
- It does not identify individual people or generate bounding boxes.
- It does not predict stampedes or prove that a location is dangerous.
- Part A performance is weaker than Part B.
- Video analysis should process sampled frames independently.
- Counts from different video frames must not be added together as unique visitors.

## Intended integration

The Python backend should load this model and expose image inference
through an API. A web frontend can send uploaded images or sampled
video frames to the backend.