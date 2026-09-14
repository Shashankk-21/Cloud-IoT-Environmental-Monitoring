import json
import os

import paho.mqtt.client as mqtt
from influxdb import InfluxDBClient

MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "weather/station1/data")
INFLUX_HOST = os.getenv("INFLUX_HOST", "localhost")
INFLUX_PORT = int(os.getenv("INFLUX_PORT", "8086"))
INFLUX_DB = os.getenv("INFLUX_DB", "weather")


db_client = InfluxDBClient(
    host=INFLUX_HOST,
    port=INFLUX_PORT,
    database=INFLUX_DB,
)


def ensure_database():
    databases = {db["name"] for db in db_client.get_list_database()}
    if INFLUX_DB not in databases:
        db_client.create_database(INFLUX_DB)
    db_client.switch_database(INFLUX_DB)


def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode("utf-8"))

        temperature = float(payload["temperature"])
        humidity = float(payload["humidity"])
        pressure = float(payload["pressure"])

        print(
            f"[+] New Data Received: "
            f"temperature={temperature}, humidity={humidity}, pressure={pressure}"
        )

        json_body = [
            {
                "measurement": "sensor_readings",
                "fields": {
                    "temperature": temperature,
                    "humidity": humidity,
                    "pressure": pressure,
                },
            }
        ]

        db_client.write_points(json_body)
        print("[+] Successfully saved to InfluxDB!")

    except (ValueError, KeyError, json.JSONDecodeError) as exc:
        print(f"[!] Invalid MQTT payload: {exc}")
    except Exception as exc:
        print(f"[!] Failed to write data: {exc}")


def main():
    ensure_database()

    mqtt_client = mqtt.Client()
    mqtt_client.on_message = on_message
    mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
    mqtt_client.subscribe(MQTT_TOPIC)

    print(f"[+] MQTT bridge connected to {MQTT_BROKER}:{MQTT_PORT}")
    print(f"[+] Subscribed to {MQTT_TOPIC}")
    print(f"[+] Writing to InfluxDB database '{INFLUX_DB}'")

    mqtt_client.loop_forever()


if __name__ == "__main__":
    main()
