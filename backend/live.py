
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, decode_token
from flask_socketio import SocketIO, join_room, emit
from models import db, Ride, Booking
from rides import ride_dict, num, err

live_bp = Blueprint("live", __name__)
socketio = SocketIO()
last_loc = {}
sid_user = {}


def can_view(ride, uid):
    if ride.driver_id == uid:
        return True
    return Booking.query.filter_by(
        ride_id=ride.id, passenger_id=uid, status="confirmed"
    ).first() is not None


@live_bp.post("/api/rides/<int:rid>/start")
@jwt_required()
def start_ride(rid):
    r = db.session.get(Ride, rid)
    if not r or r.driver_id != int(get_jwt_identity()):
        return err("Ride not found", 404)
    if r.status != "scheduled":
        return err("Only scheduled rides can be started")
    r.status = "active"
    db.session.commit()
    return jsonify({"ride": ride_dict(r)})


@live_bp.post("/api/rides/<int:rid>/end")
@jwt_required()
def end_ride(rid):
    r = db.session.get(Ride, rid)
    if not r or r.driver_id != int(get_jwt_identity()):
        return err("Ride not found", 404)
    if r.status != "active":
        return err("Only active rides can be ended")
    r.status = "completed"
    db.session.commit()
    last_loc.pop(rid, None)
    socketio.emit("ride_ended", {"ride_id": rid}, to=f"ride_{rid}")
    return jsonify({"ride": ride_dict(r)})


@socketio.on("connect")
def on_connect(auth):
    try:
        token = (auth or {}).get("token")
        sid_user[request.sid] = int(decode_token(token)["sub"])
    except Exception:
        return False


@socketio.on("disconnect")
def on_disconnect(*args):
    sid_user.pop(request.sid, None)


@socketio.on("join_ride")
def on_join(data):
    uid = sid_user.get(request.sid)
    try:
        rid = int((data or {}).get("ride_id"))
    except (TypeError, ValueError):
        return emit("error_msg", {"error": "Invalid ride"})
    ride = db.session.get(Ride, rid)
    if not uid or not ride or not can_view(ride, uid):
        return emit("error_msg", {"error": "Not allowed to track this ride"})
    if ride.status != "active":
        return emit("error_msg", {"error": "Ride is not active"})
    join_room(f"ride_{rid}")
    if rid in last_loc:
        emit("location_update", last_loc[rid])


@socketio.on("driver_location")
def on_driver_location(data):
    uid = sid_user.get(request.sid)
    try:
        d = data or {}
        rid = int(d.get("ride_id"))
        lat = num(d.get("lat"), -90, 90, "lat")
        lng = num(d.get("lng"), -180, 180, "lng")
    except (TypeError, ValueError):
        return emit("error_msg", {"error": "Invalid location data"})
    ride = db.session.get(Ride, rid)
    if not uid or not ride or ride.driver_id != uid or ride.status != "active":
        return emit("error_msg", {"error": "Not allowed to share location for this ride"})
    payload = {
        "ride_id": rid,
        "lat": lat,
        "lng": lng,
        "ts": datetime.utcnow().isoformat(),
    }
    last_loc[rid] = payload
    emit("location_update", payload, to=f"ride_{rid}")
