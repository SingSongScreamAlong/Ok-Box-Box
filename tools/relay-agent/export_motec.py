from exporters.motec_exporter import MoTeCLDExporter
import random
import math

def main():
    exporter = MoTeCLDExporter()
    
    # Define channels
    exporter.add_channel("Speed", "km/h")
    exporter.add_channel("RPM", "rpm")
    exporter.add_channel("Throttle", "%")
    exporter.add_channel("Brake", "%")
    exporter.add_channel("Steering", "deg")
    
    # Generate dummy data
    print("Generating dummy data...")
    for i in range(1000):
        t = i * 0.016 # 60hz
        exporter.add_sample({
            "Speed": 100 + math.sin(t) * 20,
            "RPM": 5000 + math.sin(t) * 1000,
            "Throttle": 100 if math.sin(t) > 0 else 0,
            "Brake": 0 if math.sin(t) > 0 else 50,
            "Steering": math.cos(t) * 90
        })
        
    # Export
    exporter.export("test_telemetry.ld")
    print("Done! Created test_telemetry.ld")

if __name__ == "__main__":
    main()
