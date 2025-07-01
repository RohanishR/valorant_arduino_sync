# valorant_arduino_sync
Valorant × Arduino Real-Time Game Sync! 🎮⚡
This project connects Valorant gameplay events to an Arduino setup using Overwolf’s Game Events API, enabling real-time hardware feedback based on in-game actions. It includes visual and motion responses such as LEDs, servo movements, and OLED updates that mirror your match performance.

🎮 Overview
Using Overwolf to capture Valorant events and a Python Flask server to relay those to an Arduino Uno, this project transforms your gameplay into a physical experience. Every kill, death, round win/loss, spike defuse, or match end is reflected using a combination of:

Green, Red, Blue, Yellow, and RGB LEDs

Servo motor

OLED screen (SSD1306 128x64)

🧠 Features
🎯 Kills
For every kill:

One green LED is turned ON (up to 5 per round).

Servo motor moves 2 times.

Kill count shown on OLED.

Kill LEDs reset after each round.

💀 Deaths
Red LED blinks 3 times on each death.

Servo moves once.

Death count shown on OLED.

💣 Spike Defuse
Blue LED lights up for 3 seconds.

Servo motor moves once.

🏆 Round Win / Loss
Win: RGB LED blinks green 3 times.

Loss: RGB LED blinks red 2 times.

Green kill LEDs reset after each round result.

🏁 Match End
If Win:

All 5 green LEDs blink 5 times.

Servo moves 2 times.

If Loss:

Red LED blinks 5 times.

Servo moves once.

OLED displays "Match Ended" + final result.

📺 OLED Display
Displays:

Round number and phase

Total kills and deaths

Round report: Damage, shots, hit zones

Spike status and health

Valorant logo splash on boot

⚙️ Hardware Setup
Component	Function
5x Green LEDs	Represent kills per round
1x Red LED	Represents death feedback
1x Blue LED	Spike defuse indicator
1x RGB LED	Round win/loss indicator
1x Yellow LED	Match activity indicator
1x Servo Motor	Physical reaction to events
1x OLED Display	Real-time data and stats
Arduino Uno R4 / Uno	Microcontroller

Pin Mapping (default):
Green LEDs: 2, 3, 4, 5, 6  
Red LED: 7  
Blue LED: 8  
RGB: Red - 9, Green - 10, Blue - 11  
Servo: 12  
Yellow LED: 13  
OLED: I2C (SDA/SCL)

🛠️ Software Stack
Overwolf GEP (Game Event Provider) – sends JSON events from Valorant.

Python Flask Server – acts as a bridge between Overwolf and Arduino over Serial.

Arduino C++ Code – processes input and controls hardware accordingly.

Adafruit SSD1306 & GFX Libraries – for OLED graphics.

ArduinoJson – to parse incoming JSON strings.

🚀 Getting Started
1. Install Requirements
Install Overwolf App and register yours self as devloper.
Here, is video https://youtu.be/6hskY4Dfrns?si=OKSnm7hqK6oQW1yb for Overwolf Application Development Tutorial.
Once you have this Devloper sample-app will available
![image](https://github.com/user-attachments/assets/cd3c6732-ec06-484f-ad69-852dbc2258f8)
![image](https://github.com/user-attachments/assets/0988c331-4b45-4342-af78-6043f5ea3538)


After, doing that find background_controller.js file in OverwolfDev sample-app (it will be in native → windows folders) and edit it.

Run Python Flask server on PC:
pip install flask pyserial
python server.py

Upload Arduino sketch to your board via Arduino IDE

/arduino_code/
  - valorant_sync.ino
/server/
  - server.py
/src/
  - background_controller.js  ← (Edited Overwolf JS backend)

2. Connect Hardware
Wire up all LEDs, servo, and OLED display as per the pin map.

3. Run
Launch Overwolf & start Valorant.

Arduino receives real-time events and reacts immediately.


Made by Rohanish Raman 👨‍💻
Powered by: Arduino UNO R4, Overwolf GEP, Python Flask, and lots of debugging!
