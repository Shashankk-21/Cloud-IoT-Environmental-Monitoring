import os
import time

print("=== Raspberry Pi Test Script ===")

uptime = os.popen("uptime -p").read().strip()
print("Uptime:", uptime)

cpu_temp = os.popen("vcgencmd measure_temp").read().strip()
print("CPU Temperature:", cpu_temp)

for i in range(5):
    print(f"Test loop {i + 1}")
    time.sleep(1)

print("All tests complete")
