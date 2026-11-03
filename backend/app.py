
import os
import re
from datetime import timedelta
import time
from collections import defaultdict, deque
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity,
)


from models import db, User
from rides import rides_bp
from bookings import bookings_bp
from live import live_bp, socketio
FRONTEND = "http://localhost:5173"

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///citygo.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = os.environ.get(
    "JWT_SECRET_KEY", "dev-only-secret-change-me-before-deploying-32chars"
)
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=12)
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024

CORS(app, origins=[FRONTEND])
db.init_app(app)
jwt = JWTManager(app)
socketio.init_app(app, cors_allowed_origins=[FRONTEND], async_mode="threading")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

attempts = defaultdict(deque)


def too_many(key, limit=20, window=300):
    """Simple in-memory rate limit: 20 attempts per 5 min per IP."""
    now = time.time()
    q = attempts[key]
    while q and now - q[0] > window:
        q.popleft()
    if len(q) >= limit:
        return True
    q.append(now)
    return False


@app.after_request
def security_headers(r):
    r.headers["X-Content-Type-Options"] = "nosniff"
    r.headers["X-Frame-Options"] = "DENY"
    return r



def err(msg, code=400):
    return jsonify({"error": msg}), code


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/api/auth/register")
def register():
    
    if too_many(request.remote_addr):
        return err("Too many attempts. Try again in a few minutes.", 429)

    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not 2 <= len(name) <= 80:
        return err("Name must be 2-80 characters")
    if not EMAIL_RE.match(email) or len(email) > 120:
        return err("Invalid email")
    if len(password) < 8 or len(password) > 128:
        return err("Password must be 8-128 characters")
    if User.query.filter_by(email=email).first():
        return err("Email already registered", 409)

    user = User(name=name, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 201


@app.post("/api/auth/login")
def login():
    
    if too_many(request.remote_addr):
        return err("Too many attempts. Try again in a few minutes.", 429)

    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return err("Invalid email or password", 401)
    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()})


@app.get("/api/auth/me")
@jwt_required()
def me():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return err("User not found", 404)
    return jsonify({"user": user.to_dict()})

app.register_blueprint(rides_bp)
app.register_blueprint(bookings_bp)
app.register_blueprint(live_bp)
with app.app_context():
    db.create_all()



if __name__ == "__main__":
    socketio.run(
        app,
        host="127.0.0.1",
        port=5000,
        debug=os.environ.get("FLASK_DEBUG", "1") == "1",
        allow_unsafe_werkzeug=True,
    )
