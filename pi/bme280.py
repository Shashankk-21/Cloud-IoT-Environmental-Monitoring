import json
import os
import time

import paho.mqtt.client as mqtt
import qwiic_bme280

BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "YOUR_EC2_PUBLIC_IP")
BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", "1883"))
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "weather/station1/data")
PUBLISH_INTERVAL = float(os.getenv("PUBLISH_INTERVAL", "5"))


def main():
    sensor = qwiic_bme280.QwiicBme280()

    if sensor.begin() is False:
        raise RuntimeError(
            "BME280 sensor not detected. Check Qwiic/I2C wiring and run: i2cdetect -y 1"
        )

    print("[+] BME280 initialized")
    print(f"[+] MQTT broker: {BROKER_HOST}:{BROKER_PORT}")
    print(f"[+] MQTT topic: {MQTT_TOPIC}")

    client = mqtt.Client()
    client.connect(BROKER_HOST, BROKER_PORT, 60)

    try:
        while True:
            data = {
                "temperature": round(float(sensor.temperature_celsius), 2),
                "humidity": round(float(sensor.humidity), 2),
                # SparkFun Qwiic library returns pressure in Pa; store hPa.
                "pressure": round(float(sensor.pressure) / 100.0, 2),
            }

            payload = json.dumps(data)
            result = client.publish(MQTT_TOPIC, payload)
            result.wait_for_publish()
            print(f"[+] Sent: {data}")
            time.sleep(PUBLISH_INTERVAL)
    except KeyboardInterrupt:
        print("\n[+] Stopping sensor publisher")
    finally:
        client.disconnect()


if __name__ == "__main__":
    main()
