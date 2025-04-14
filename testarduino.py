import serial
import time

# Set the correct COM port and baud rate for your Arduino
COM_PORT = 'COM12'  # Change this to your Arduino's COM port
BAUD_RATE = 9600

def read_arduino_feedback():
    try:
        # Open the serial connection to Arduino
        ser = serial.Serial(COM_PORT, BAUD_RATE, timeout=1)  # timeout=1 second
        print(f"Connected to Arduino on {COM_PORT} at {BAUD_RATE} baud.")

        # Send a PING command to Arduino after successful connection
        ser.write(b'PING\n')
        print("Sent PING to Arduino.")

        while True:
            # Wait for a response from Arduino
            if ser.in_waiting > 0:
                feedback = ser.readline().decode('utf-8').strip()  # Read and decode the feedback
                if feedback:
                    print(f"Arduino says: {feedback}")
                
                # Optionally, you can send a response to the Arduino
                if feedback == "PONG":
                    print("Arduino responded with PONG.")
                    # Send more commands as needed
                elif feedback == "STATUS: ACTIVE":
                    print("System is active.")
                elif feedback == "STATUS: SHUTDOWN":
                    print("System is shutting down.")
                elif feedback == "ERROR: UNKNOWN_COMMAND":
                    print("Received an unknown command error.")

            time.sleep(0.1)  # Small delay to avoid overwhelming the CPU

    except serial.SerialException as e:
        print(f"Error connecting to serial port: {e}")
    except KeyboardInterrupt:
        print("Exiting program.")
    finally:
        if 'ser' in locals() and ser.is_open:
            ser.close()
            print("Serial connection closed.")

if __name__ == '__main__':
    read_arduino_feedback()
