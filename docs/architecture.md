# System Architecture

The system follows an edge-to-cloud architecture in which the Raspberry Pi collects environmental measurements from the BME280 sensor and publishes them to an MQTT broker hosted on AWS EC2. A Python bridge stores the incoming measurements in InfluxDB, while a Node.js/Express API exposes the latest reading to the React dashboard.

```mermaid
flowchart LR
    S[BME280 Sensor] -->|I2C| P[Raspberry Pi 3B]
    P -->|MQTT| M[Mosquitto MQTT Broker]
    M -->|Subscribe| B[bridge.py]
    B -->|Write measurements| I[InfluxDB]
    I -->|Query latest data| A[Node.js / Express API]
    A -->|HTTP JSON| R[React Dashboard]
    I -->|Visualization| G[Grafana]
