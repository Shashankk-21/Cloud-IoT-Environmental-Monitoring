# System architecture

```mermaid
flowchart LR
    S[BME280 Sensor]\n    -->|I2C| P[Raspberry Pi 3B\nPython Publisher]

    P -->|MQTT over TCP\nweather/station1/data| M[Amazon EC2\nMosquitto Broker]

    M -->|MQTT Subscribe| B[bridge.py]
    B -->|Write points| D[(InfluxDB\nweather / sensor_readings)]

    D -->|Query latest reading| A[Node.js + Express API\n/api/data :5000]

    A -->|HTTP JSON| F[React Dashboard]
    D --> G[Grafana :3000]
```

## Data path

1. The BME280 measures temperature, humidity, and pressure.
2. The Raspberry Pi reads the sensor over I2C.
3. Python serializes the measurements as JSON.
4. Paho MQTT publishes the JSON payload to `weather/station1/data`.
5. Mosquitto on AWS EC2 receives and routes the MQTT message.
6. `bridge.py` subscribes to the topic and writes the values into InfluxDB.
7. The Node.js/Express API queries the latest InfluxDB record.
8. The React dashboard polls the API and displays the telemetry.
9. Grafana can query the same InfluxDB database for independent visualization.
