from flask import Flask, request
from flask_cors import CORS
import serial
import json

app = Flask(__name__)
CORS(app)

arduino = serial.Serial('COM5', 9600)

@app.route('/event')
def handle_event():
    name = request.args.get("name", "")
    data = request.args.get("data", "")

    print(f"[EVENT] name={name}, data={data}")

    try:
        try:
            parsed_data = json.loads(data)
        except json.JSONDecodeError:
            parsed_data = data

        if name in ["kill", "death", "round_start", "match_start", "round_end", "match_end", "spike_defused","spike_detonated","match_start"]:
            arduino.write(f"{name}\n".encode())
            print(f"➡️ Sent: {name}")

        elif name in ["round_phase", "round_number", "score", "match_score", "round_report"]:
            arduino.write(f"{name}:{data}\n".encode())
            print(f"➡️ Sent: {name}:{data}")
            

    except Exception as e:
        print("❌ Error:", e)

    return "OK"

if __name__ == '__main__':
    print("🔥 Python server running at http://localhost:5000")
    app.run(port=5000)
