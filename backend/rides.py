
import math
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Ride

rides_bp = Blueprint("rides", __name__)


def err(msg, code=400):
    return jsonify({"error": msg}), code


def num(v, lo, hi, name):
    try:
        if isinstance(v, bool):
            raise ValueError
        f = float(v)
    except (TypeError, ValueError):
        raise ValueError(f"Invalid {name}")
    if not math.isfinite(f) or not lo <= f <= hi:
        raise ValueError(f"{name} must be between {lo} and {hi}")
    return f


def text(v, name):
    s = str(v or "").strip()
    if not 1 <= len(s) <= 200:
        raise ValueError(f"{name} is required (max 200 chars)")
    return s


def haversine(lat1, lng1, lat2, lng2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def ride_dict(r):
    return {
        "id": r.id,
        "driver_id": r.driver_id,
        "driver_name": r.driver.name,
        "origin_name": r.origin_name, "origin_lat": r.origin_lat, "origin_lng": r.origin_lng,
        "dest_name": r.dest_name, "dest_lat": r.dest_lat, "dest_lng": r.dest_lng,
        "departure_time": r.departure_time.isoformat(),
        "seats_total": r.seats_total,
        "seats_available": r.seats_available,
        "price_per_seat": r.price_per_seat,
        "status": r.status,
    }


@rides_bp.post("/api/rides")
@jwt_required()
def offer_ride():
    d = request.get_json(silent=True) or {}
    try:
        origin_name = text(d.get("origin_name"), "Origin")
        dest_name = text(d.get("dest_name"), "Destination")
        o_lat = num(d.get("origin_lat"), -90, 90, "origin_lat")
        o_lng = num(d.get("origin_lng"), -180, 180, "origin_lng")
        d_lat = num(d.get("dest_lat"), -90, 90, "dest_lat")
        d_lng = num(d.get("dest_lng"), -180, 180, "dest_lng")
        seats = int(num(d.get("seats"), 1, 8, "seats"))
        price = num(d.get("price_per_seat"), 0, 10000, "price_per_seat")
        dep = datetime.fromisoformat(str(d.get("departure_time"))).replace(tzinfo=None)
    except ValueError as e:
        return err(str(e) or "Invalid input")
    if dep <= datetime.now():
        return err("Departure time must be in the future")

    ride = Ride(
        driver_id=int(get_jwt_identity()),
        origin_name=origin_name, origin_lat=o_lat, origin_lng=o_lng,
        dest_name=dest_name, dest_lat=d_lat, dest_lng=d_lng,
        departure_time=dep, seats_total=seats, seats_available=seats,
        price_per_seat=price,
    )
    db.session.add(ride)
    db.session.commit()
    return jsonify({"ride": ride_dict(ride)}), 201


@rides_bp.get("/api/rides/search")
@jwt_required()
def search_rides():
    a = request.args
    try:
        p_lat = num(a.get("pickup_lat"), -90, 90, "pickup_lat")
        p_lng = num(a.get("pickup_lng"), -180, 180, "pickup_lng")
        q_lat = num(a.get("drop_lat"), -90, 90, "drop_lat")
        q_lng = num(a.get("drop_lng"), -180, 180, "drop_lng")
        seats = int(num(a.get("seats", 1), 1, 8, "seats"))
        radius = num(a.get("radius_km", 5), 0.5, 50, "radius_km")
        day = datetime.strptime(a["date"], "%Y-%m-%d").date() if a.get("date") else None
    except ValueError as e:
        return err(str(e) or "Invalid input")

    me = int(get_jwt_identity())
    candidates = Ride.query.filter(
        Ride.status == "scheduled",
        Ride.departure_time > datetime.now(),
        Ride.seats_available >= seats,
        Ride.driver_id != me,
    ).all()

    results = []
    for r in candidates:
        if day and r.departure_time.date() != day:
            continue
        d1 = haversine(p_lat, p_lng, r.origin_lat, r.origin_lng)
        d2 = haversine(q_lat, q_lng, r.dest_lat, r.dest_lng)
        if d1 <= radius and d2 <= radius:
            item = ride_dict(r)
            item["pickup_distance_km"] = round(d1, 2)
            item["drop_distance_km"] = round(d2, 2)
            results.append((d1 + d2, item))
    results.sort(key=lambda x: x[0])
    return jsonify({"rides": [x[1] for x in results]})
