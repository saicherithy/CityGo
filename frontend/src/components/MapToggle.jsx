
import { useState } from "react";
import RouteMap from "./RouteMap";

export default function MapToggle({ ride, pickup, drop }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)}>
        {open ? "Hide map" : "Show map"}
      </button>
      {open && <RouteMap ride={ride} pickup={pickup} drop={drop} />}
    </div>
  );
}
