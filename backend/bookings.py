
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Ride, Booking
from rides import ride_dict, num, text, err

bookings_bp = Blueprint("bookings", __name__)


def booking_dict(b):
    return {
        "id": b.id, "seats": b.seats, "status": b.status,
        "pickup_name": b.pickup_name, "drop_name": b.drop_name,
        "pickup_lat": b.pickup_lat, "pickup_lng": b.pickup_lng,
        "drop_lat": b.drop_lat, "drop_lng": b.drop_lng,
        "created_at": b.created_at.isoformat(),
        "ride": ride_dict(b.ride),
    }


@bookings_bp.post("/api/bookings")
@jwt_required()
def book():
    d = request.get_json(silent=True) or {}
    me = int(get_jwt_identity())
    try:
        ride_id = int(num(d.get("ride_id"), 1, 10**9, "ride_id"))
        seats = int(num(d.get("seats", 1), 1, 8, "seats"))
        loc = {}
        for p in ("pickup", "drop"):
            if d.get(p + "_name"):
                loc[p + "_name"] = text(d.get(p + "_name"), p)
                loc[p + "_lat"] = num(d.get(p + "_lat"), -90, 90, p + "_lat")
                loc[p + "_lng"] = num(d.get(p + "_lng"), -180, 180, p + "_lng")
    except ValueError as e:
        return err(str(e) or "Invalid input")

    ride = db.session.get(Ride, ride_id)
    if not ride:
        return err("Ride not found", 404)
    if ride.driver_id == me:
        return err("You cannot book your own ride", 403)
    if ride.status != "scheduled" or ride.departure_time <= datetime.now():
        return err("Ride is not open for booking")
    if Booking.query.filter_by(ride_id=ride_id, passenger_id=me, status="confirmed").first():
        return err("You already booked this ride", 409)

    # atomic seat decrement: fails if seats ran out meanwhile
    updated = Ride.query.filter(
        Ride.id == ride_id, Ride.seats_available >= seats
    ).update({Ride.seats_available: Ride.seats_available - seats})
    if not updated:
        db.session.rollback()
        return err("Not enough seats available", 409)

    b = Booking(ride_id=ride_id, passenger_id=me, seats=seats, **loc)
    db.session.add(b)
    db.session.commit()
    return jsonify({"booking": booking_dict(b)}), 201


@bookings_bp.get("/api/bookings/mine")
@jwt_required()
def my_bookings():
    me = int(get_jwt_identity())
    items = Booking.query.filter_by(passenger_id=me).order_by(Booking.created_at.desc()).all()
    return jsonify({"bookings": [booking_dict(b) for b in items]})


@bookings_bp.post("/api/bookings/<int:bid>/cancel")
@jwt_required()
def cancel_booking(bid):
    me = int(get_jwt_identity())
    b = db.session.get(Booking, bid)
    if not b or b.passenger_id != me:
        return err("Booking not found", 404)
    if b.status != "confirmed":
        return err("Booking is already cancelled")
    if b.ride.status != "scheduled":
        return err("Cannot cancel once the ride has started or ended")
    b.status = "cancelled"
    b.ride.seats_available = min(b.ride.seats_total, b.ride.seats_available + b.seats)
    db.session.commit()
    return jsonify({"booking": booking_dict(b)})


@bookings_bp.get("/api/rides/mine")
@jwt_required()
def my_rides():
    me = int(get_jwt_identity())
    rides = Ride.query.filter_by(driver_id=me).order_by(Ride.departure_time.desc()).all()
    out = []
    for r in rides:
        item = ride_dict(r)
        item["bookings"] = [
            {"id": b.id, "passenger": b.passenger.name, "seats": b.seats, "status": b.status}
            for b in Booking.query.filter_by(ride_id=r.id).all()
        ]
        out.append(item)
    return jsonify({"rides": out})


@bookings_bp.post("/api/rides/<int:rid>/cancel")
@jwt_required()
def cancel_ride(rid):
    me = int(get_jwt_identity())
    r = db.session.get(Ride, rid)
    if not r or r.driver_id != me:
        return err("Ride not found", 404)
    if r.status != "scheduled":
        return err("Only scheduled rides can be cancelled")
    r.status = "cancelled"
    for b in Booking.query.filter_by(ride_id=rid, status="confirmed").all():
        b.status = "cancelled"
    db.session.commit()
    return jsonify({"ride": ride_dict(r)})
