from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class OvercrowdingIncident(db.Model):
    __tablename__ = 'overcrowding_incidents'
    
    id = db.Column(db.Integer, primary_key=True)
    bus_id = db.Column(db.String(50), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    detected = db.Column(db.Integer, nullable=False)
    excess = db.Column(db.Integer, nullable=False)
    penalty = db.Column(db.Float, nullable=False)
    resolved = db.Column(db.Boolean, default=False)
    shutdown_triggered = db.Column(db.Boolean, default=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'bus_id': self.bus_id,
            'timestamp': self.timestamp.isoformat(),
            'capacity': self.capacity,
            'detected': self.detected,
            'excess': self.excess,
            'penalty': self.penalty,
            'resolved': self.resolved,
            'shutdown_triggered': self.shutdown_triggered
        }

class Bus(db.Model):
    __tablename__ = 'buses'
    
    id = db.Column(db.String(50), primary_key=True)
    license_plate = db.Column(db.String(20), nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    current_route = db.Column(db.String(100))
    last_maintenance = db.Column(db.DateTime)
    
    def to_dict(self):
        return {
            'id': self.id,
            'license_plate': self.license_plate,
            'capacity': self.capacity,
            'current_route': self.current_route,
            'last_maintenance': self.last_maintenance.isoformat() if self.last_maintenance else None
        }