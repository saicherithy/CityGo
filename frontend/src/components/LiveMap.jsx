
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import icon from "leaflet/dist/images/marker-icon.png";
import icon2x from "leaflet/dist/images/marker-icon-2x.png";
import shadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconUrl: icon,
  iconRetinaUrl: icon2x,
  shadowUrl: shadow,
});

export default function LiveMap({ ride, pos }) {
  const el = useRef(null);
  const mapRef = useRef(null);
  const dotRef = useRef(null);
  const centered = useRef(false);

  useEffect(() => {
    const map = L.map(el.current);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    const o = [ride.origin_lat, ride.origin_lng];
    const d = [ride.dest_lat, ride.dest_lng];

    L.marker(o).addTo(map).bindPopup("Start: " + ride.origin_name);
    L.marker(d).addTo(map).bindPopup("Destination: " + ride.dest_name);

    map.fitBounds([o, d], { padding: [30, 30] });
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      dotRef.current = null;
      centered.current = false;
    };
  }, [ride.id]);

  useEffect(() => {
    if (!pos || !mapRef.current) return;

    const ll = [pos.lat, pos.lng];

    if (!dotRef.current) {
      dotRef.current = L.circleMarker(ll, {
        radius: 10,
        color: "#ea580c",
        fillColor: "#f97316",
        fillOpacity: 0.9,
      })
        .addTo(mapRef.current)
        .bindPopup("Driver (live)");
    } else {
      dotRef.current.setLatLng(ll);
    }

    if (!centered.current) {
      mapRef.current.setView(ll, 15);
      centered.current = true;
    } else {
      mapRef.current.panTo(ll);
    }
  }, [pos]);

  return <div ref={el} className="map" />;
}
