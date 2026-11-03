
import { useEffect, useState } from "react";

export default function LocationInput({ placeholder, onSelect }) {
  const [text, setText] = useState("");
  const [options, setOptions] = useState([]);
  const [picked, setPicked] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (picked || text.trim().length < 3) {
      setOptions([]);
      setMsg("");
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(text)}`
        );
        const d = await r.json();
        setOptions(d);
        setMsg(d.length ? "" : "No results");
      } catch {
        setMsg("Location search failed");
      }
    }, 700);
    return () => clearTimeout(t);
  }, [text, picked]);

  function choose(o) {
    setText(o.display_name.slice(0, 200));
    setPicked(true);
    setOptions([]);
    onSelect({
      name: o.display_name.slice(0, 200),
      lat: parseFloat(o.lat),
      lng: parseFloat(o.lon),
    });
  }

  return (
    <div className="locwrap">
      <input
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setPicked(false);
          onSelect(null);
        }}
      />
      {picked && <small className="ok">✓ Location set</small>}
      {msg && <small>{msg}</small>}
      {options.length > 0 && (
        <ul className="opts">
          {options.map((o) => (
            <li key={o.place_id} onClick={() => choose(o)}>{o.display_name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
