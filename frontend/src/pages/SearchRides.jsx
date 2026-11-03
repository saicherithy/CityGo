
import { useState } from "react";
import { api } from "../api";
import LocationInput from "../components/LocationInput";
import MapToggle from "../components/MapToggle";

export default function SearchRides() {
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [date, setDate] = useState("");
  const [seats, setSeats] = useState(1);
  const [rides, setRides] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function search(e) {
    e.preventDefault();
    setError("");
    if (!from || !to) return setError("Pick pickup and drop from the suggestions");
    const q = new URLSearchParams({
      pickup_lat: from.lat, pickup_lng: from.lng,
      drop_lat: to.lat, drop_lng: to.lng, seats,
    });
    if (date) q.set("date", date);
    try {
      const d = await api(`/rides/search?${q}`);
      setRides(d.rides);
    } catch (err) {
      setError(err.message);
    }
  }

  async function book(r) {
    setError(""); setMsg("");
    try {
      await api("/bookings", {
        method: "POST",
        body: {
          ride_id: r.id, seats: Number(seats),
          pickup_name: from.name, pickup_lat: from.lat, pickup_lng: from.lng,
          drop_name: to.name, drop_lat: to.lat, drop_lng: to.lng,
        },
      });
      setMsg(`Ride #${r.id} booked! See My Bookings.`);
      setRides(rides.filter((x) => x.id !== r.id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <form className="card" onSubmit={search}>
        <h2>Find a Ride</h2>
        {error && <p className="error">{error}</p>}
        <LocationInput placeholder="Pickup (type 3+ letters)" onSelect={setFrom} />
        <LocationInput placeholder="Drop" onSelect={setTo} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input type="number" min="1" max="8" value={seats} onChange={(e) => setSeats(e.target.value)} />
        <button type="submit">Search</button>
      </form>
      {msg && <p className="ok center">{msg}</p>}
{error && <p className="error center">{error}</p>}

      {rides && rides.length === 0 && <p className="center">No matching rides found.</p>}
      {rides && rides.map((r) => (
        <div className="ride" key={r.id}>
          <b>{r.origin_name}</b> → <b>{r.dest_name}</b>
          <div>Driver: {r.driver_name} · {new Date(r.departure_time).toLocaleString()}</div>
          <div>Seats left: {r.seats_available} · ₹{r.price_per_seat}/seat</div>
          <small>Pickup is {r.pickup_distance_km} km from the driver's start; drop is {r.drop_distance_km} km from their destination</small>
          <div><button onClick={() => book(r)}>Book {seats} seat(s)</button></div>
          <MapToggle ride={r} pickup={from} drop={to} />
        </div>
      ))}
    </div>
  );
}
