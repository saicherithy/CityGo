
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import icon from "leaflet/dist/images/marker-icon.png";
import icon2x from "leaflet/dist/images/marker-icon-2x.png";
import shadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({ iconUrl: icon, iconRetinaUrl: icon2x, shadowUrl: shadow });

export default function RouteMap({ ride, pickup, drop }) {
  const el = useRef(null);
  const layerRef = useRef(null);
  const mapRef = useRef(null);
  const [info, setInfo] = useState("Loading route...");

  useEffect(() => {
    const map = L.map(el.current).setView([ride.origin_lat, ride.origin_lng], 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => map.remove();
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    const map = mapRef.current;
    layer.clearLayers();
    const o = [ride.origin_lat, ride.origin_lng];
    const d = [ride.dest_lat, ride.dest_lng];
    L.marker(o).addTo(layer).bindPopup("Driver start: " + ride.origin_name);
    L.marker(d).addTo(layer).bindPopup("Driver destination: " + ride.dest_name);
    const pts = [o, d];
    if (pickup) {
      L.circleMarker([pickup.lat, pickup.lng], { radius: 9, color: "#2563eb" })
        .addTo(layer).bindPopup("Your pickup");
      pts.push([pickup.lat, pickup.lng]);
    }
    if (drop) {
      L.circleMarker([drop.lat, drop.lng], { radius: 9, color: "#dc2626" })
        .addTo(layer).bindPopup("Your drop");
      pts.push([drop.lat, drop.lng]);
    }
    map.fitBounds(pts, { padding: [30, 30] });

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${o[1]},${o[0]};${d[1]},${d[0]}?overview=full&geometries=geojson`;
    fetch(url, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => {
        if (j.code !== "Ok") throw new Error("no route");
        const rt = j.routes[0];
        L.geoJSON(rt.geometry, { style: { color: "#0f766e", weight: 5 } }).addTo(layer);
        setInfo(`Route: ${(rt.distance / 1000).toFixed(1)} km, about ${Math.round(rt.duration / 60)} min`);
      })
      .catch(() => {
        if (ctrl.signal.aborted && !timer) return;
        L.polyline([o, d], { color: "#0f766e", dashArray: "8" }).addTo(layer);
        setInfo("Routing service unavailable. Showing a straight line.");
      })
      .finally(() => clearTimeout(timer));

    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [ride.id, pickup?.lat, pickup?.lng, drop?.lat, drop?.lng]);

  return (
    <div>
      <small>{info}</small>
      <div ref={el} className="map" />
    </div>
  );
}
