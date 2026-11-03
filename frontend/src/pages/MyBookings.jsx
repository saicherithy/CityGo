
import { useEffect, useState } from "react";
import { api } from "../api";
import MapToggle from "../components/MapToggle";
import { Link } from "react-router-dom";

export default function MyBookings() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  const load = () =>
    api("/bookings/mine").then((d) => setItems(d.bookings)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function cancel(id) {
    setError("");
    try {
      await api(`/bookings/${id}/cancel`, { method: "POST" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <h2>My Bookings</h2>
      {error && <p className="error">{error}</p>}
      {items && items.length === 0 && <p>No bookings yet.</p>}
      {items && items.map((b) => (
        <div className="ride" key={b.id}>
          <b>{b.ride.origin_name}</b> → <b>{b.ride.dest_name}</b>
          <div>Driver: {b.ride.driver_name} · {new Date(b.ride.departure_time).toLocaleString()}</div>
          <div>{b.seats} seat(s) · ₹{b.ride.price_per_seat * b.seats}</div>
          <div>
            Booking: <span className={`badge ${b.status}`}>{b.status}</span>{" "}
            Ride: <span className={`badge ${b.ride.status}`}>{b.ride.status}</span>
          </div>
          {b.status === "confirmed" && b.ride.status === "scheduled" && (
            <button onClick={() => cancel(b.id)}>Cancel booking</button>
          )}
          
    {b.status === "confirmed" &&
      (b.ride.status === "scheduled" || b.ride.status === "active") && (
        <div>
          <Link className="btnlink" to={`/track/${b.ride.id}`}>
            Track live
          </Link>
        </div>
      )}

          
<MapToggle
  ride={b.ride}
  pickup={b.pickup_lat != null ? { lat: b.pickup_lat, lng: b.pickup_lng } : null}
  drop={b.drop_lat != null ? { lat: b.drop_lat, lng: b.drop_lng } : null}
/>

        </div>
      ))}
    </div>
  );
}
