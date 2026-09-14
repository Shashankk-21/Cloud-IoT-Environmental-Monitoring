# Edge-to-Cloud IoT Environmental Monitoring System

A Raspberry Pi–based environmental monitoring system that reads a SparkFun Qwiic BME280 sensor, publishes telemetry using MQTT, processes it on an AWS EC2 cloud server, stores it in InfluxDB, exposes it through a Node.js/Express API, and visualizes it in a React dashboard. Grafana can also be connected to the same time-series database.

> **Reconstruction note:** The original AWS EC2 instance and the original frontend project were deleted after the project demonstration. The backend files and dashboard included here are clean reconstructions of the demonstrated architecture and known behavior, not byte-for-byte recovery of the deleted files. The Raspberry Pi code has also been cleaned up to remove the old hardcoded public IP and to store BME280 pressure in hPa.

## Architecture

```text
┌───────────────────┐
│ SparkFun Qwiic    │
│ BME280 Sensor     │
└─────────┬─────────┘
          │ I2C
          ▼
┌───────────────────┐
│ Raspberry Pi 3B   │
│ Python Publisher  │
└─────────┬─────────┘
          │ MQTT
          │ weather/station1/data
          ▼
┌──────────────────────────────────────┐
│ AWS EC2                              │
│                                      │
│ Mosquitto → bridge.py → InfluxDB     │
│                         │            │
│                         ▼            │
│                    Express API       │
│                       :5000          │
│                         │            │
│                         ▼            │
│                  React Dashboard     │
│                                      │
│ Grafana :3000 (optional)             │
└──────────────────────────────────────┘
```

A Mermaid version is available in [`docs/architecture.md`](docs/architecture.md).

## What the system demonstrates

- **IoT sensing:** BME280 temperature, humidity, and pressure measurements.
- **Edge computing:** the Raspberry Pi performs local sensor acquisition and prepares telemetry before transmission.
- **MQTT messaging:** telemetry is published to a topic and routed through Mosquitto.
- **Cloud computing:** an AWS EC2 Linux instance hosts the broker, database, bridge, API, and optional Grafana service.
- **Time-series storage:** InfluxDB stores timestamped environmental readings.
- **Backend/API development:** Express exposes the latest reading as JSON.
- **Frontend development:** a React dashboard consumes the API and displays the measurements and an in-session trend.
- **Process management:** PM2 can keep the Python bridge and Node API running on the EC2 host.

## Hardware

- Raspberry Pi 3B
- SparkFun Qwiic BME280 environmental sensor
- Qwiic cable / appropriate Raspberry Pi connection
- MicroSD card with Raspberry Pi OS
- Stable 5 V power supply
- Network connection

### BME280 I2C wiring used in the project

| BME280 / Qwiic | Raspberry Pi |
| --- | --- |
| 3.3 V | Pin 1 |
| GND | Pin 6 |
| SDA | Pin 3 / GPIO2 |
| SCL | Pin 5 / GPIO3 |

The sensor was observed at I2C address `0x77` during testing. Verify your own hardware with:

```bash
i2cdetect -y 1
```

## Software stack

### Edge

- Raspberry Pi OS / Linux
- Python 3
- `qwiic_bme280`
- Paho MQTT

### Cloud / backend

- AWS EC2
- Ubuntu Linux
- Eclipse Mosquitto
- InfluxDB 1.x-style database API
- Python MQTT → InfluxDB bridge
- Node.js + Express
- PM2
- Grafana (optional)

### Frontend

- React
- Vite
- Recharts
- Plain CSS for the dashboard UI

## Repository structure

```text
Cloud-IoT-Environmental-Monitoring/
├── README.md
├── LICENSE
├── .gitignore
│
├── pi/
│   ├── bme280.py
│   ├── bme280_test.py
│   ├── test_pi.py
│   ├── requirements.txt
│   └── .env.example
│
├── backend/
│   ├── bridge.py
│   ├── server.js
│   ├── package.json
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── package.json
│   ├── index.html
│   ├── .env.example
│   └── src/
│       ├── main.jsx
│       └── styles.css
│
├── infrastructure/
│   ├── mosquitto.conf.example
│   └── aws-ec2-setup.md
│
├── docs/
│   ├── architecture.md
│   ├── data-flow.md
│   └── screenshots/
│
└── tests/
```

## Data format

The Raspberry Pi publishes JSON to:

```text
weather/station1/data
```

Example payload:

```json
{
  "temperature": 28.46,
  "humidity": 62.05,
  "pressure": 925.69
}
```

The pressure value is stored in **hPa**. The SparkFun Qwiic Python library reports pressure in Pa, so the publisher converts it by dividing by 100.

### InfluxDB schema

Database:

```text
weather
```

Measurement:

```text
sensor_readings
```

Fields:

```text
temperature   float   °C
humidity      float   % RH
pressure      float   hPa
```

InfluxDB supplies the timestamp for each inserted point.

## 1. Raspberry Pi setup

Enable I2C:

```bash
sudo raspi-config
```

Then enable I2C and reboot.

Verify the sensor:

```bash
i2cdetect -y 1
```

You should see the sensor address in the scan. During the project, `77` was observed.

Create the Python environment:

```bash
cd pi
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Configure the MQTT broker without committing the actual EC2 IP:

```bash
export MQTT_BROKER_HOST=<EC2_PUBLIC_IP>
export MQTT_BROKER_PORT=1883
export MQTT_TOPIC=weather/station1/data
export PUBLISH_INTERVAL=5
```

Run the publisher:

```bash
python3 bme280.py
```

Expected behavior:

```text
[+] BME280 initialized
[+] MQTT broker: <EC2_PUBLIC_IP>:1883
[+] MQTT topic: weather/station1/data
[+] Sent: {'temperature': 28.46, 'humidity': 62.05, 'pressure': 925.69}
```

## 2. AWS EC2 setup

Create or start an Ubuntu EC2 instance. The original project used one EC2 host for the cloud-side services.

Connect using SSH:

```bash
ssh -i "Ubuntu_Key.pem" ubuntu@<EC2_PUBLIC_IP>
```

**Never commit `Ubuntu_Key.pem` or any private key to GitHub.** The repository `.gitignore` already excludes `*.pem` and other common secret files.

Install the required services on the EC2 host. Exact package commands can vary by Ubuntu/InfluxDB release; see [`infrastructure/aws-ec2-setup.md`](infrastructure/aws-ec2-setup.md).

## 3. Mosquitto MQTT broker

The original demonstration used:

```conf
listener 1883
allow_anonymous true
```

This is a **lab/demo configuration**. It should not be copied unchanged into a production deployment. For a real deployment, use authentication, TLS, and a restricted security-group rule.

After configuration:

```bash
sudo systemctl restart mosquitto
sudo systemctl status mosquitto
```

To test message flow on the EC2 host:

```bash
mosquitto_sub -t weather/station1/data
```

Then publish a test payload from another terminal:

```bash
mosquitto_pub -t weather/station1/data -m '{"temperature":25,"humidity":60,"pressure":1000}'
```

## 4. InfluxDB

Create the database:

```text
influx
CREATE DATABASE weather
USE weather
SHOW MEASUREMENTS
```

After telemetry is flowing:

```text
SELECT * FROM sensor_readings ORDER BY time DESC LIMIT 5
```

## 5. Python MQTT → InfluxDB bridge

On EC2:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 bridge.py
```

The bridge subscribes to:

```text
weather/station1/data
```

and writes the three sensor fields to the `sensor_readings` measurement.

For a persistent process, PM2 can run the Python script:

```bash
pm2 start bridge.py --name bridge --interpreter python3
pm2 save
pm2 list
```

## 6. Node.js API

Install Node dependencies:

```bash
cd backend
npm install
```

Run:

```bash
npm start
```

The API listens on port `5000` by default.

Test:

```text
http://<EC2_PUBLIC_IP>:5000/
http://<EC2_PUBLIC_IP>:5000/api/data
```

Example response:

```json
{
  "time": "2026-09-15T00:00:00.000Z",
  "temperature": 28.46,
  "humidity": 62.05,
  "pressure": 925.69
}
```

The timestamp formatting is handled by the backend so the frontend receives a normal ISO-8601 timestamp rather than the raw InfluxDB nanosecond representation.

Run persistently with PM2:

```bash
pm2 start server.js --name server
pm2 save
pm2 list
```

## 7. React dashboard

The original dashboard was deleted with the local frontend project. A clean React/Vite dashboard is reconstructed in this repository.

Install:

```bash
cd frontend
npm install
```

Create `.env` from `.env.example`:

```text
VITE_API_URL=http://<EC2_PUBLIC_IP>:5000
```

Start the development server:

```bash
npm run dev
```

Open the Vite URL shown in the terminal, commonly:

```text
http://localhost:5173
```

The dashboard polls `/api/data` every five seconds and builds a short trend from readings received during the current browser session.

Build for deployment:

```bash
npm run build
```

The generated static files are placed in `frontend/dist/`.

## 8. Optional Grafana

Grafana can be connected to the same `weather` InfluxDB database. The original project also used Grafana during the demonstration as an additional visualization layer.

Do not expose InfluxDB's port `8086` publicly just to make Grafana work. When both services run on the same EC2 instance, Grafana can use the local database endpoint instead.

## 9. End-to-end verification

The complete data path should be tested in this order:

```text
BME280
  ↓
Raspberry Pi Python script
  ↓
MQTT publish
  ↓
Mosquitto on EC2
  ↓
bridge.py
  ↓
InfluxDB
  ↓
Node /api/data
  ↓
React dashboard
```

Useful checks:

### Raspberry Pi

```bash
i2cdetect -y 1
python3 bme280.py
```

### MQTT

```bash
mosquitto_sub -t weather/station1/data
```

### Bridge

```bash
pm2 logs bridge
```

### InfluxDB

```text
influx
USE weather
SELECT * FROM sensor_readings ORDER BY time DESC LIMIT 5
```

### API

Open:

```text
http://<EC2_PUBLIC_IP>:5000/api/data
```

### Frontend

Open the Vite development URL and confirm the three metric cards update.

## 10. AWS security group

The original demonstration used several inbound ports. A safer policy is:

| Port | Service | Recommended source |
| --- | --- | --- |
| 22 | SSH | Your public IP only |
| 1883 | MQTT | Raspberry Pi network / trusted source only |
| 5000 | Node API | Dashboard client or reverse proxy |
| 3000 | Grafana | Your IP or trusted network |
| 8086 | InfluxDB | **Do not expose publicly** unless genuinely required |

For production, MQTT should use authentication and TLS rather than anonymous port 1883 traffic.

## Screenshots

Add your real project screenshots to `docs/screenshots/`, for example:

```text
docs/screenshots/
├── architecture.png
├── raspberry-pi-terminal.png
├── mqtt-terminal.png
├── influxdb-query.png
├── react-dashboard.png
└── grafana-dashboard.png
```

Do not fabricate screenshots. Use screenshots from the actual demonstration or the reconstructed system after you run it again.

## Known limitations

- The deleted EC2 instance means the original cloud deployment is no longer live.
- The original frontend source is no longer available; the dashboard in this repository is a reconstruction.
- The demo MQTT configuration used anonymous access and plaintext port 1883.
- The basic API exposes only the latest reading; historical visualization can be expanded with additional API endpoints.
- The React trend shown by the reconstructed dashboard represents values observed during the current browser session, rather than querying historical points from InfluxDB.

## Future improvements

- Use MQTT username/password plus TLS.
- Use a private networking path or VPN between the edge device and cloud.
- Add authentication to the API.
- Add an API endpoint for historical ranges and downsampled telemetry.
- Deploy the frontend behind Nginx with HTTPS.
- Use a managed/production-ready time-series database strategy.
- Add alerts for abnormal temperature, humidity, or pressure.
- Add device identity and support for multiple sensor stations.
- Add automated deployment and service monitoring.

## Project status

The original system was successfully demonstrated end-to-end before the EC2 instance was deleted. This repository packages the architecture, cleaned edge code, reconstructed backend, and a rebuilt dashboard so the project can be studied, reproduced, documented, and presented.

## License

MIT. See [`LICENSE`](LICENSE).
