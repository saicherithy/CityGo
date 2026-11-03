
import { useEffect, useState } from "react";
import { api } from "../api";
import MapToggle from "../components/MapToggle";
import { Link } from "react-router-dom";

export default function MyRides() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  const load = () =>
    api("/rides/mine").then((d) => setItems(d.rides)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function cancel(id) {
    setError("");
    try {
      await api(`/rides/${id}/cancel`, { method: "POST" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <h2>My Rides (Driver)</h2>
      {error && <p className="error">{error}</p>}
      {items && items.length === 0 && <p>You have not offered any rides.</p>}
      {items && items.map((r) => (
        <div className="ride" key={r.id}>
          <b>{r.origin_name}</b> → <b>{r.dest_name}</b>
          <div>{new Date(r.departure_time).toLocaleString()} · Seats left: {r.seats_available}/{r.seats_total}</div>
          <div>Status: <span className={`badge ${r.status}`}>{r.status}</span></div>
          {r.bookings.map((b) => (
            <div key={b.id}><small>{b.passenger} · {b.seats} seat(s) · {b.status}</small></div>
          ))}
          
{(r.status === "scheduled" || r.status === "active") && (
  <div>
    <Link className="btnlink" to={`/drive/${r.id}`}>
      Start / manage ride
    </Link>
  </div>
)}

          {r.status === "scheduled" && (
            <button onClick={() => cancel(r.id)}>Cancel ride</button>
          )}
          <MapToggle ride={r} />
        </div>
      ))}
    </div>
  );
}
