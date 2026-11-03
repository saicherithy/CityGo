
import { useState } from "react";
import { api } from "../api";
import LocationInput from "../components/LocationInput";

export default function OfferRide() {
  const [origin, setOrigin] = useState(null);
  const [dest, setDest] = useState(null);
  const [time, setTime] = useState("");
  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState(50);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setOk("");
    if (!origin || !dest) return setError("Pick origin and destination from the suggestions");
    try {
      const d = await api("/rides", {
        method: "POST",
        body: {
          origin_name: origin.name, origin_lat: origin.lat, origin_lng: origin.lng,
          dest_name: dest.name, dest_lat: dest.lat, dest_lng: dest.lng,
          departure_time: time, seats: Number(seats), price_per_seat: Number(price),
        },
      });
      setOk(`Ride #${d.ride.id} offered successfully`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>Offer a Ride</h2>
      {error && <p className="error">{error}</p>}
      {ok && <p className="ok">{ok}</p>}
      <LocationInput placeholder="Origin (type 3+ letters)" onSelect={setOrigin} />
      <LocationInput placeholder="Destination" onSelect={setDest} />
      <input type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} required />
      <input type="number" min="1" max="8" value={seats} onChange={(e) => setSeats(e.target.value)} placeholder="Seats" required />
      <input type="number" min="0" max="10000" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price per seat (₹)" required />
      <button type="submit">Offer ride</button>
    </form>
  );
}
