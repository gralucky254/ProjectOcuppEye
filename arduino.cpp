// Define relay pin (connected to relay module input)
const int relayPin = 7;
bool motorRunning = false;
String inputString = "";
bool handshakeComplete = false;
bool shutdown = false;  // Flag to prevent further actions after shutdown

void setup() {
  // Initialize Serial and pin
  Serial.begin(9600);
  pinMode(relayPin, OUTPUT);

  // Make sure motor is off initially
  digitalWrite(relayPin, LOW); 
  delay(100);
}

void loop() {
  // Exit loop if shutdown was issued
  if (shutdown) return;

  // Check for serial input
  if (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      processCommand(inputString);
      inputString = "";  // Clear input after processing
    } else {
      inputString += c;
    }
  }
}

void processCommand(String command) {
  command.trim();  // Remove whitespace or newline

  if (command == "HANDSHAKE") {
    Serial.println("ARDUINO_READY");
    startMotor();  // Turn on motor immediately after successful handshake
    handshakeComplete = true;

  } else if (command == "SHUTDOWN") {
    if (handshakeComplete) {
      stopMotor();
      Serial.println("SHUTDOWN_OK");
      shutdown = true;  // Stop further processing
    } else {
      Serial.println("ERROR_NO_HANDSHAKE");
    }

  } else if (command == "PING") {
    Serial.println("PONG");

  } else {
    Serial.println("UNKNOWN_COMMAND");
  }
}

void startMotor() {
  digitalWrite(relayPin, HIGH);  // Relay ON (motor running)
  motorRunning = true;
}

void stopMotor() {
  digitalWrite(relayPin, LOW);   // Relay OFF (motor stops)
  motorRunning = false;
}
