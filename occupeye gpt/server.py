import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import cv2
import numpy as np
import base64  # Added missing import
from email.mime.text import MIMEText
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
import serial
import serial.tools.list_ports
import time
import atexit
import threading
import datetime  # Added missing import
from typing import Optional, Tuple

# ========== Configuration ==========
load_dotenv()

class Config:
    ARDUINO_PORT = os.getenv("ARDUINO_PORT", "COM12")
    BAUD_RATE = int(os.getenv("BAUD_RATE", "9600"))
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "projectocuppeye@gmail.com")
    EMAIL_USER = os.getenv("EMAIL_USER", "projectocuppeye@gmail.com")
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    FACE_DETECTION_SCALE = float(os.getenv("FACE_DETECTION_SCALE", "1.1"))
    MIN_NEIGHBORS = int(os.getenv("MIN_NEIGHBORS", "4"))

# ========== Flask App Setup ==========
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = Config.MAX_FILE_SIZE

# Enhanced CORS configuration
CORS(app, resources={
    r"/*": {
        "origins": Config.ALLOWED_ORIGINS,
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "supports_credentials": True,
        "max_age": 86400
    }
})

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ========== Serial Manager ==========
class SerialManager:
    def __init__(self, port: str, baud_rate: int = 9600):
        self.port = port
        self.baud_rate = baud_rate
        self.connection: Optional[serial.Serial] = None
        self.lock = threading.Lock()
        self.connection_attempts = 0
        self.max_attempts = 3
        self.ready = False

    def connect(self) -> bool:
        with self.lock:
            if self.connection and self.connection.is_open:
                return True

            try:
                ports = [p.device for p in serial.tools.list_ports.comports()]
                if self.port not in ports:
                    logger.error(f"Port {self.port} not found. Available: {ports}")
                    return False

                if self.connection:
                    self.connection.close()

                self.connection = serial.Serial(
                    port=self.port,
                    baudrate=self.baud_rate,
                    timeout=2,
                    write_timeout=2
                )
                time.sleep(2)  # Arduino initialization time

                # Clear buffers and handshake
                self.connection.reset_input_buffer()
                self.connection.reset_output_buffer()
                self.connection.write(b"HANDSHAKE\n")

                # Wait for response with timeout
                start_time = time.time()
                while time.time() - start_time < 5:
                    if self.connection.in_waiting:
                        response = self.connection.readline().decode().strip()
                        if response == "ARDUINO_READY":
                            self.ready = True
                            self.connection_attempts = 0
                            logger.info("Arduino connection established")
                            return True
                        logger.debug(f"Received: {response}")

                raise RuntimeError("Handshake timeout")

            except Exception as e:
                self.connection_attempts += 1
                self.ready = False
                if self.connection:
                    self.connection.close()
                self.connection = None
                logger.error(f"Connection attempt {self.connection_attempts} failed: {str(e)}")
                return False

    def send_command(self, command: str, expect_response: bool = False, timeout: float = 2.0) -> Tuple[bool, Optional[str]]:
        if not self.connect():
            return False, None

        try:
            with self.lock:
                self.connection.timeout = timeout
                self.connection.write(f"{command}\n".encode())
                
                if expect_response:
                    response = self.connection.readline().decode().strip()
                    return True, response
                return True, None
        except Exception as e:
            logger.error(f"Command failed: {command} - {str(e)}")
            self.ready = False
            if self.connection:
                self.connection.close()
            self.connection = None
            return False, None

    def close(self):
        with self.lock:
            if self.connection and self.connection.is_open:
                self.connection.close()
            self.connection = None
            self.ready = False

serial_manager = SerialManager(port=Config.ARDUINO_PORT, baud_rate=Config.BAUD_RATE)

# ========== Email Service ==========
def get_gmail_service():
    SCOPES = ['https://www.googleapis.com/auth/gmail.send']
    TOKEN_FILE = "token.json"
    
    creds = None
    try:
        if os.path.exists(TOKEN_FILE):
            creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    "credentials.json",
                    scopes=SCOPES,
                    redirect_uri="http://localhost:8080"
                )
                creds = flow.run_local_server(port=8080, open_browser=False)
            
            with open(TOKEN_FILE, 'w') as token:
                token.write(creds.to_json())

        return build('gmail', 'v1', credentials=creds)
    except Exception as e:
        logger.error(f"Gmail service init failed: {str(e)}")
        return None

def send_alert_email(bus_id: str, face_count: int) -> bool:
    try:
        service = get_gmail_service()
        if not service:
            return False

        subject = f"🚨 Overcrowding Alert - Bus {bus_id}"
        body = f"""Overcrowding detected on Bus {bus_id}:
- Detected faces: {face_count}
- Time: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
- Action: Automatic shutdown initiated"""

        message = MIMEText(body)
        message['to'] = Config.ADMIN_EMAIL
        message['from'] = Config.EMAIL_USER
        message['subject'] = subject

        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        service.users().messages().send(
            userId='me',
            body={'raw': raw}
        ).execute()
        return True
    except Exception as e:
        logger.error(f"Email failed: {e}")
        return False

# ========== Routes ==========
@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        connected, _ = serial_manager.send_command("PING", expect_response=True)
        return jsonify({
            "status": "healthy",
            "arduino_connected": connected,
            "services": {
                "face_detection": True,
                "email": get_gmail_service() is not None
            }
        })
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/overcrowding-alert', methods=['POST'])
def handle_overcrowding_alert():
    try:
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 400

        data = request.get_json()
        bus_id = data.get('busId')
        face_count = data.get('faceCount')

        if not bus_id or face_count is None:
            return jsonify({"error": "Missing busId or faceCount"}), 400

        # Send alert email
        email_sent = send_alert_email(bus_id, face_count)

        # Send shutdown command
        success, response = serial_manager.send_command("SHUTDOWN", True)

        return jsonify({
            "status": "alert_processed",
            "email_sent": email_sent,
            "arduino_response": response if success else "failed"
        })
    except Exception as e:
        logger.error(f"Alert error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/detect_faces', methods=['POST'])
def detect_faces():
    try:
        # Validate request
        if 'video_frame' not in request.files:
            return jsonify({"error": "No video frame provided"}), 400

        file = request.files['video_frame']
        
        # Validate file size
        if file.content_length > Config.MAX_FILE_SIZE:
            return jsonify({
                "error": f"File too large (max {Config.MAX_FILE_SIZE/1024/1024}MB)"
            }), 413

        # Process image
        try:
            img_array = np.frombuffer(file.read(), np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError("Failed to decode image")
        except Exception as e:
            logger.error(f"Image processing error: {str(e)}")
            return jsonify({"error": "Invalid image data"}), 400

        # Detect faces with error handling
        try:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            )
            faces = face_cascade.detectMultiScale(
                gray, 
                scaleFactor=Config.FACE_DETECTION_SCALE,
                minNeighbors=Config.MIN_NEIGHBORS
            )
        except Exception as e:
            logger.error(f"Face detection error: {str(e)}")
            return jsonify({"error": "Face detection failed"}), 500

        return jsonify({
            "face_count": len(faces),
            "faces": [{"x": int(x), "y": int(y), "w": int(w), "h": int(h)} 
                     for (x, y, w, h) in faces]
        })

    except Exception as e:
        logger.error(f"Unexpected error in detect_faces: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500

# ========== Startup & Cleanup ==========
def initialize_services():
    """Initialize all required services"""
    logger.info("Initializing services...")
    
    # Initialize serial connection
    if not serial_manager.connect():
        logger.warning("Initial Arduino connection failed - will retry on demand")
    
    # Initialize email service in background thread
    def init_email_service():
        try:
            if get_gmail_service():
                logger.info("Email service initialized successfully")
        except Exception as e:
            logger.error(f"Email service init failed: {e}")

    email_thread = threading.Thread(target=init_email_service)
    email_thread.daemon = True
    email_thread.start()

@atexit.register
def cleanup():
    """Cleanup resources on exit"""
    logger.info("Cleaning up resources...")
    serial_manager.close()
    logger.info("Cleanup complete")

if __name__ == '__main__':
    initialize_services()
    
    try:
        from waitress import serve
        logger.info("Starting production server (Waitress)")
        serve(app, host="0.0.0.0", port=5000)
    except ImportError:
        logger.info("Starting development server")
        app.run(
            host="0.0.0.0",
            port=5000,
            debug=True,
            use_reloader=False,
            threaded=True
        )