# AWS EC2 setup

This document describes the cloud-side deployment used for the original demonstration.

## EC2

Create an Ubuntu EC2 instance and allow SSH access from your own IP. During the original demo, the instance hosted the MQTT broker, InfluxDB, Python bridge, Node.js API, and Grafana.

Typical application ports used by the project:

| Port | Purpose | Exposure guidance |
| --- | --- | --- |
| 22 | SSH | Restrict to your IP |
| 1883 | MQTT | Restrict to the device/network; do not expose broadly in production |
| 5000 | Node API | Restrict to the dashboard/client |
| 3000 | Grafana | Restrict to the dashboard/client |
| 8086 | InfluxDB | Prefer localhost/private network; normally do not expose publicly |

The project originally used a public MQTT listener for the classroom/demo environment. For a production deployment, use MQTT authentication and TLS, and tighten the security group.

## Mosquitto

Install Mosquitto and configure the listener using `mosquitto.conf.example` as a starting point.

After configuration:

```bash
sudo systemctl enable mosquitto
sudo systemctl restart mosquitto
sudo systemctl status mosquitto
```

## InfluxDB

Install the InfluxDB version appropriate for the deployment and create the `weather` database.

Example InfluxDB shell verification for the original v1-style schema:

```text
influx
SHOW DATABASES;
CREATE DATABASE weather;
USE weather;
SHOW MEASUREMENTS;
```

The application writes measurement `sensor_readings` with fields:

- `temperature` — degrees Celsius
- `humidity` — relative humidity percentage
- `pressure` — hPa

## Python MQTT → InfluxDB bridge

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 bridge.py
```

For a persistent process, the original project used PM2. An example is:

```bash
pm2 start bridge.py --name bridge --interpreter python3
pm2 save
pm2 list
```

## Node.js API

```bash
cd backend
npm install
npm start
```

For PM2:

```bash
pm2 start server.js --name server
pm2 save
pm2 list
```

The API is available at:

```text
http://<EC2_PUBLIC_IP>:5000/api/data
```

## Important

The original EC2 instance was deleted after the demonstration. The backend source files in this repository are a clean reconstruction of the known project behavior, not a byte-for-byte recovery of the deleted server files.
