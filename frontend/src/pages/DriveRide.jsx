
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { connectSocket } from "../socket";
import LiveMap from "../components/LiveMap";

export default function DriveRide() {
  const { id } = useParams();
  const [ride, setRide] = useState(null);
  const [pos, setPos] = useState(null);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(0);

  const load = () =>
    api("/rides/mine")
      .then((d) => {
        const r = d.rides.find((x) => x.id === Number(id));
        r ? setRide(r) : setError("Ride not found");
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, [id]);

  const active = ride?.status === "active";

  useEffect(() => {
    if (!active) return;

    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser");
      return;
    }

    const socket = connectSocket();
    socket.on("error_msg", (d) => setError(d.error));
    socket.on("connect_error", () => setError("Live connection failed"));

    let last = 0;

    const watch = navigator.geolocation.watchPosition(
      (p) => {
        const cur = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
        };

        setPos(cur);

        if (Date.now() - last >= 2000) {
          last = Date.now();
          socket.emit("driver_location", {
            ride_id: Number(id),
            ...cur,
          });
          setSent((n) => n + 1);
        }
      },
      (e) => setError("GPS error: " + e.message),
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 15000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watch);
      socket.disconnect();
    };
  }, [active, id]);

  async function action(kind) {
    setError("");

    try {
      await api(`/rides/${id}/${kind}`, { method: "POST" });

      if (kind === "end") setPos(null);

      load();
    } catch (e) {
      setError(e.message);
    }
  }

  if (!ride) return <p>{error || "Loading..."}</p>;

  const booked = ride.bookings.filter(
    (b) => b.status === "confirmed"
  );

  return (
    <div>
      <h2>
        Drive: {ride.origin_name.split(",")[0]} →{" "}
        {ride.dest_name.split(",")[0]}
      </h2>

      {error && <p className="error">{error}</p>}

      <p>
        Status:{" "}
        <span className={`badge ${ride.status}`}>
          {ride.status}
        </span>{" "}
        · Confirmed passengers: {booked.length}
      </p>

      {ride.status === "scheduled" && (
        <button onClick={() => action("start")}>Start ride</button>
      )}

      {active && (
        <>
          <p className="ok">
            Sharing live location (updates sent: {sent}). Keep this tab open.
          </p>
          <button onClick={() => action("end")}>End ride</button>
        </>
      )}

      {ride.status === "completed" && <p>Ride completed.</p>}

      <LiveMap ride={ride} pos={pos} />
    </div>
  );
}
