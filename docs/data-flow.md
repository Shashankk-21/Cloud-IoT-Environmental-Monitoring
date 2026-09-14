# MQTT payload and database schema

## MQTT payload

Example:

```json
{
  "temperature": 28.46,
  "humidity": 62.05,
  "pressure": 925.69
}
```

## InfluxDB

Database: `weather`

Measurement: `sensor_readings`

Fields:

```text
temperature : float (°C)
humidity    : float (% RH)
pressure    : float (hPa)
```

Each write receives an InfluxDB timestamp automatically.
