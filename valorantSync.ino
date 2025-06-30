#include <Servo.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ArduinoJson.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

Servo myServo;

int greenLEDs[5] = { 2, 3, 4, 5, 6 };  // 5 green LEDs
int redLED = 7;
int blueLED = 8;

int rgbRed = 9;
int rgbGreen = 10;
int rgbBlue = 11;

int servoPin = 12;

int yellowLED = 13;

int perRoundKills = 0, roundDeaths = 0;
int totalKills = 0, totalDeaths = 0;
int roundWins = 0, roundLosses = 0;
int prevWon = 0, prevLost = 0;

String roundNumber = "";
String roundPhase = "";

void setup() {
  Serial.begin(9600);
  myServo.attach(servoPin);
  myServo.write(90);

  for (int i = 0; i < 5; i++) {
    pinMode(greenLEDs[i], OUTPUT);
    digitalWrite(greenLEDs[i], LOW);
  }
  pinMode(redLED, OUTPUT);
  pinMode(blueLED, OUTPUT);
  pinMode(yellowLED, OUTPUT);
  pinMode(rgbRed, OUTPUT);
  pinMode(rgbGreen, OUTPUT);
  pinMode(rgbBlue, OUTPUT);

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    for (;;)
      ;
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("Waiting for match...");
  display.display();
}

void loop() {
  if (Serial.available()) {
    String input = Serial.readStringUntil('\n');
    input.trim();

    if (input == "match_start") {
      totalKills = totalDeaths = perRoundKills = roundDeaths = roundWins = roundLosses = prevWon = prevLost = 0;
      displayMessage("Match Started!");
      digitalWrite(yellowLED, HIGH);

    }

    else if (input == "kill") {
      perRoundKills++;
      totalKills++;
      if (perRoundKills <= 5) digitalWrite(greenLEDs[perRoundKills - 1], HIGH);
      moveServo(2);
      updateStats();
    }

    else if (input == "death") {
      roundDeaths++;
      totalDeaths++;
      blinkLED(redLED, 3, 200);
      moveServo(1);
      updateStats();
    }

    else if (input == "spike_defused" || input == "spike_detonated") {
      digitalWrite(blueLED, HIGH);
      moveServo(1);
      delay(3000);
      digitalWrite(blueLED, LOW);
    }

    else if (input.startsWith("round_phase:")) {
      roundPhase = input.substring(12);
      updateStats();
    }

    else if (input.startsWith("round_number:")) {
      roundNumber = input.substring(13);
      perRoundKills = 0;
      updateStats();
    }

    else if (input == "match_end") {
      display.clearDisplay();
      display.setCursor(0, 0);
      display.setTextSize(1);
      digitalWrite(yellowLED, LOW);
      display.println("Match Ended!");
      display.print("Final: ");
      if (roundWins > roundLosses) {
        display.println("VICTORY !");
        blinkAllGreenLEDs(5);
        moveServo(2);
      } else if (roundLosses > roundWins) {
        display.println("DEFEATED !");
        blinkLED(redLED, 5, 300);
        moveServo(1);
      } else {
        display.println("DRAW");
      }
      display.display();
    }

    else if (input.startsWith("score:")) {
      String json = input.substring(6);
      StaticJsonDocument<100> doc;
      if (!deserializeJson(doc, json)) {
        int won = doc["won"];
        int lost = doc["lost"];

        if (won > prevWon) {
          roundWins++;
          blinkRGB(0, 255, 0, 3, 200);  // green 3 times
          resetGreenLEDs();
          displayRoundResult("WON");
        } else if (lost > prevLost) {
          roundLosses++;
          blinkRGB(255, 0, 0, 2, 300);  // red 2 times
          resetGreenLEDs();
          displayRoundResult("LOST");
        }

        prevWon = won;
        prevLost = lost;
      }
    }

    else if (input.startsWith("match_score:")) {
      String mscore = input.substring(12);
      displayRoundInfo("Match Score", mscore);
    }

    else if (input.startsWith("round_report:")) {
      String report = input.substring(13);
      StaticJsonDocument<200> doc;
      if (!deserializeJson(doc, report)) {
        display.clearDisplay();
        display.setCursor(0, 0);
        display.setTextSize(1);
        display.println("Round Report:");
        display.print("Dmg: ");
        display.print(doc["damage"].as<float>());
        display.print(" Rcv: ");
        display.println(doc["damage_received"].as<int>());
        display.print("Hit: ");
        display.print(doc["hit"].as<int>());
        display.print(" H:");
        display.print(doc["headshot"].as<int>());
        display.print(" B:");
        display.print(doc["bodyshots"].as<int>());
        display.print(" L:");
        display.println(doc["legshots"].as<int>());
        display.display();
        delay(4000);
        updateStats();
      }
    }
  }
}

void blinkLED(int pin, int times, int delayTime) {
  for (int i = 0; i < times; i++) {
    digitalWrite(pin, HIGH);
    delay(delayTime);
    digitalWrite(pin, LOW);
    delay(delayTime);
  }
}

void blinkAllGreenLEDs(int times) {
  for (int i = 0; i < times; i++) {
    for (int j = 0; j < 5; j++) digitalWrite(greenLEDs[j], HIGH);
    delay(300);
    for (int j = 0; j < 5; j++) digitalWrite(greenLEDs[j], LOW);
    delay(300);
  }
}

void blinkRGB(int r, int g, int b, int times, int delayTime) {
  for (int i = 0; i < times; i++) {
    analogWrite(rgbRed, r);
    analogWrite(rgbGreen, g);
    analogWrite(rgbBlue, b);
    delay(delayTime);
    analogWrite(rgbRed, 0);
    analogWrite(rgbGreen, 0);
    analogWrite(rgbBlue, 0);
    delay(delayTime);
  }
}

void resetGreenLEDs() {
  for (int i = 0; i < 5; i++) digitalWrite(greenLEDs[i], LOW);
}

void moveServo(int times) {
  for (int i = 0; i < times; i++) {
    myServo.write(0);
    delay(200);
    myServo.write(90);
    delay(200);
  }
}

void displayMessage(String msg) {
  display.clearDisplay();
  display.setCursor(0, 0);
  display.setTextSize(1);
  display.println(msg);
  display.display();
}

void displayRoundInfo(String title, String value) {
  display.clearDisplay();
  display.setCursor(0, 0);
  display.setTextSize(1);
  display.println(title + ":");
  display.println(value);
  display.display();
}

void displayRoundResult(String result) {
  display.clearDisplay();
  display.setCursor(0, 0);
  display.setTextSize(2);
  display.println(result);
  display.display();
  delay(3000);
  updateStats();
}

void updateStats() {
  display.clearDisplay();
  display.setCursor(0, 0);
  display.setTextSize(1);
  display.print("Round Number: ");
  display.println(roundNumber);
  display.print("Round Phase : ");
  display.println(roundPhase);
  display.println("Match Details:");
  display.print("Kill : ");
  display.println(totalKills);
  display.print("Death: ");
  display.println(totalDeaths);
  display.display();
}
