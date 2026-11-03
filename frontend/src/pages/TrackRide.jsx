
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { connectSocket } from "../socket";
import LiveMap from "../components/LiveMap";

export default function TrackRide() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [pos, setPos] = useState(null);
  const [error, setError] = useState("");

  const load = () =>
    api("/bookings/mine")
      .then((d) => {
        const mine = d.bookings.filter(
          (x) => x.ride.id === Number(id)
        );

        const b =
          mine.find((x) => x.status === "confirmed") || mine[0];

        b ? setBooking(b) : setError("No booking for this ride");
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, [id]);

  const rideStatus = booking?.ride.status;
  const confirmed = booking?.status === "confirmed";

  useEffect(() => {
    if (rideStatus !== "scheduled") return;

    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [rideStatus, id]);

  useEffect(() => {
    if (rideStatus !== "active" || !confirmed) return;

    const s = connectSocket();

    s.on("connect", () =>
      s.emit("join_ride", { ride_id: Number(id) })
    );

    s.on("location_update", (d) =>
      setPos({ lat: d.lat, lng: d.lng, ts: d.ts })
    );

    s.on("ride_ended", () => load());
    s.on("error_msg", (d) => setError(d.error));
    s.on("connect_error", () =>
      setError("Live connection failed")
    );

    return () => s.disconnect();
  }, [rideStatus, confirmed, id]);

  if (!booking) return <p>{error || "Loading..."}</p>;

  return (
    <div>
      <h2>
        Track: {booking.ride.origin_name.split(",")[0]} →{" "}
        {booking.ride.dest_name.split(",")[0]}
      </h2>

      {error && <p className="error">{error}</p>}

      <p>
        Driver: {booking.ride.driver_name} · Ride:{" "}
        <span className={`badge ${rideStatus}`}>
          {rideStatus}
        </span>
      </p>

      {!confirmed && (
        <p className="error">This booking is cancelled.</p>
      )}

      {rideStatus === "scheduled" && confirmed && (
        <p>Waiting for the driver to start the ride (checking every 5 s)...</p>
      )}

      {rideStatus === "active" && confirmed && (
        <p>
          {pos
            ? `Live. Last update: ${new Date(
                pos.ts + "Z"
              ).toLocaleTimeString()}`
            : "Connected. Waiting for the driver's first GPS fix..."}
        </p>
      )}

      {rideStatus === "completed" && (
        <p>This ride has been completed.</p>
      )}

      <LiveMap ride={booking.ride} pos={pos} />
    </div>
  );
}
