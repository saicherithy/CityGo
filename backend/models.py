
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, pw):
        self.password_hash = generate_password_hash(pw)

    def check_password(self, pw):
        return check_password_hash(self.password_hash, pw)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "email": self.email}


class Ride(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    driver_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    origin_name = db.Column(db.String(200), nullable=False)
    origin_lat = db.Column(db.Float, nullable=False)
    origin_lng = db.Column(db.Float, nullable=False)
    dest_name = db.Column(db.String(200), nullable=False)
    dest_lat = db.Column(db.Float, nullable=False)
    dest_lng = db.Column(db.Float, nullable=False)
    departure_time = db.Column(db.DateTime, nullable=False)
    seats_total = db.Column(db.Integer, nullable=False)
    seats_available = db.Column(db.Integer, nullable=False)
    price_per_seat = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default="scheduled")
    driver = db.relationship("User")


class Booking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ride_id = db.Column(db.Integer, db.ForeignKey("ride.id"), nullable=False)
    passenger_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    seats = db.Column(db.Integer, default=1, nullable=False)
    pickup_name = db.Column(db.String(200))
    pickup_lat = db.Column(db.Float)
    pickup_lng = db.Column(db.Float)
    drop_name = db.Column(db.String(200))
    drop_lat = db.Column(db.Float)
    drop_lng = db.Column(db.Float)
    status = db.Column(db.String(20), default="confirmed")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    ride = db.relationship("Ride")
    passenger = db.relationship("User")
