# Stride

## Video Demo
[![Watch the demo](<img width="787" height="555" alt="Screenshot 2026-04-13 at 2 20 02 AM" src="https://github.com/user-attachments/assets/6de56174-72cb-4925-8b25-8f62be2d4774" />
)](https://www.youtube.com/watch?v=lfB2SNkqhy4)
<p align="center">Click the thumbnail to watch our demo on YouTube</p>

## What it does

Stride uses a high-frequency Modulino sensor (accelerometer + gyroscope) strapped to the runner's shoe to capture the micro-mechanics of every stride. The app processes this raw data into four user-friendly insights:
- **Step Rhythm (Cadence):** Uses peak-detection algorithms to help you maintain an efficient "metronome" rhythm, no matter your pace, reducing stress on your knees.
- **Landing Zone (Foot Strike):** Uses sensor fusion to detect whether you are a heel, midfoot, or forefoot striker, steering you toward a more efficient, injury-resistant form.
- **Ground Spring (Contact Time):** Measures the milliseconds your foot spends on the pavement. We help you turn "heavy" steps into light, athletic springs.
- **Landing Softness (Impact Shock):** Calculates the G-force of every strike using the runner’s body metrics to ensure you aren't absorbing more shock than their joints can handle.

The app features a Live Dashboard with color-coded "Safety Zones," giving runners instant visual and audio feedback so they can correct their form mid-run and prevent injuries before they happen.

## How we built it

![Stride Architecture Diagram](https://i.imgur.com/tMaj1TY.png)

We strapped the Modulino Movement IMU sensor to the lace area of a running shoe to collect real-time movement data. Using the Arduino Uno Q’s MPU running Linux, we hosted a FastAPI server that pulls data from the MCU via the Bridge. This backend performs personalized heuristic analysis on the raw sensor data and streams the metrics directly to the user’s phone via a WebSocket.

For the frontend, we built a responsive mobile interface featuring an interactive Mapbox GL map to track the runner's route, paired with dynamic charting to visualize the live sensor data. We used the MUI and swiper.js framework for components, and also integrated the ElevenLabs API to provide real-time, audible feedback, mimicking a real personal coach running right beside you.

## What’s Next for Stride

- **Edge AI Integration:** Fully utilizing the Uno Q’s MPU to deploy lightweight, custom machine learning models directly on the board for even deeper biomechanical analysis without cloud latency.
- **Multi-Sensor Expansion:** Adding a synchronized sensor to the other foot for symmetrical analysis, or to the lower back to track upper body posture and rotation.
- **Ease of Use:** Incorporating a battery inside the Arduino unit to remove the need for an external battery pack.
