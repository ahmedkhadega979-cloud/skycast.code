import { useEffect, useRef, useState } from "react";

// Free API, no key needed: https://open-meteo.com
const GEO = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST = "https://api.open-meteo.com/v1/forecast";

const sky = (code) => {
  if (code === 0) return ["Clear sky", "☀️", "clear"];
  if (code <= 2) return ["Partly cloudy", "⛅", "cloudy"];
  if (code === 3) return ["Overcast", "☁️", "cloudy"];
  if (code <= 48) return ["Fog", "🌫️", "cloudy"];
  if (code <= 57) return ["Drizzle", "🌦️", "rain"];
  if (code <= 67) return ["Rain", "🌧️", "rain"];
  if (code <= 77) return ["Snow", "❄️", "snow"];
  if (code <= 82) return ["Rain showers", "🌦️", "rain"];
  if (code <= 86) return ["Snow showers", "🌨️", "snow"];
  return ["Thunderstorm", "⛈️", "storm"];
};

function useStored(key, initial) {
  const [v, setV] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } }, [key, v]);
  return [v, setV];
}

function Search({ onPick, onLocate }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {  // debounce: wait until the user stops typing
      fetch(`${GEO}?name=${encodeURIComponent(q.trim())}&count=5`, { signal: ctrl.signal })
        .then((r) => r.json()).then((d) => setResults(d.results || [])).catch(() => {});
    }, 350);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);
  const pick = (c) => { onPick({ name: c.name, country: c.country, lat: c.latitude, lon: c.longitude }); setQ(""); setResults([]); };
  return (
    <div className="search">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for a city" aria-label="Search for a city" />
      <button onClick={onLocate} aria-label="Use my location" title="Use my location">📍</button>
      {results.length > 0 && (
        <ul className="suggest">
          {results.map((c) => (
            <li key={c.id}><button onClick={() => pick(c)}>{c.name}{c.admin1 ? `, ${c.admin1}` : ""} <small>{c.country}</small></button></li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HourlyChart({ temps, fmt }) {
  const W = 600, H = 110, min = Math.min(...temps), max = Math.max(...temps), span = max - min || 1;
  const pts = temps.map((t, i) => [(i / (temps.length - 1)) * W, H - 14 - ((t - min) / span) * (H - 34)]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Temperature over the next 24 hours">
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      {pts.map(([x, y], i) => i % 6 === 0 && (
        <g key={i}><circle cx={x} cy={y} r="4" fill="currentColor" /><text x={x} y={y - 9} textAnchor={i === 0 ? "start" : "middle"} fontSize="14" fill="currentColor">{fmt(temps[i])}°</text></g>
      ))}
    </svg>
  );
}

export default function App() {
  const [place, setPlace] = useStored("skycast:place", { name: "Cairo", country: "Egypt", lat: 30.0444, lon: 31.2357 });
  const [recent, setRecent] = useStored("skycast:recent", []);
  const [unit, setUnit] = useStored("skycast:unit", "C");
  const [state, setState] = useState({ status: "loading" });
  const [retry, setRetry] = useState(0);
  const fmt = (c) => Math.round(unit === "C" ? c : (c * 9) / 5 + 32);

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ status: "loading" });
    const url = `${FORECAST}?latitude=${place.lat}&longitude=${place.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day&hourly=temperature_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`;
    fetch(url, { signal: ctrl.signal })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setState({ status: "ok", data }))
      .catch((e) => e.name !== "AbortError" && setState({ status: "error" }));
    return () => ctrl.abort();
  }, [place, retry]);

  const choose = (p) => {
    setPlace(p);
    setRecent((r) => [p, ...r.filter((x) => x.name !== p.name)].slice(0, 5));
  };
  const locate = () => {
    if (!navigator.geolocation) return alert("Location is not supported in this browser.");
    navigator.geolocation.getCurrentPosition(
      (pos) => choose({ name: "My location", country: "", lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => alert("Could not get your location. Please allow location access or search for a city.")
    );
  };

  const d = state.data;
  const [label, icon, mood] = d ? sky(d.current.weather_code) : ["", "", "clear"];
  const theme = d && !d.current.is_day ? "night" : mood;
  const start = d ? Math.max(0, d.hourly.time.findIndex((t) => t >= d.current.time.slice(0, 13))) : 0;

  return (
    <div className="page" data-sky={theme}>
      <main className="wrap">
        <header>
          <h1>SkyCast</h1>
          <Search onPick={choose} onLocate={locate} />
          <div className="units" role="group" aria-label="Temperature unit">
            {["C", "F"].map((u) => <button key={u} className={unit === u ? "on" : ""} aria-pressed={unit === u} onClick={() => setUnit(u)}>°{u}</button>)}
          </div>
        </header>

        {recent.length > 0 && (
          <nav className="recent" aria-label="Recent cities">
            {recent.map((p) => <button key={p.name} onClick={() => setPlace(p)}>{p.name}</button>)}
          </nav>
        )}

        {state.status === "loading" && <div className="glass skeleton" role="status" aria-live="polite">Loading forecast…</div>}

        {state.status === "error" && (
          <div className="glass" role="alert">
            <p>Could not load the forecast. Check your connection and try again.</p>
            <button onClick={() => setRetry(retry + 1)}>Retry</button>
          </div>
        )}

        {state.status === "ok" && (
          <>
            <section className="glass now" aria-live="polite">
              <div>
                <h2>{place.name}{place.country && <small>, {place.country}</small>}</h2>
                <p className="big">{fmt(d.current.temperature_2m)}°<span>{unit}</span></p>
                <p>{label} · Feels like {fmt(d.current.apparent_temperature)}°</p>
              </div>
              <div className="icon" aria-hidden="true">{icon}</div>
              <ul className="facts">
                <li><span>Humidity</span><b>{d.current.relative_humidity_2m}%</b></li>
                <li><span>Wind</span><b>{Math.round(d.current.wind_speed_10m)} km/h</b></li>
                <li><span>Rain today</span><b>{d.daily.precipitation_probability_max[0] ?? 0}%</b></li>
              </ul>
            </section>

            <section className="glass">
              <h3>Next 24 hours</h3>
              <HourlyChart temps={d.hourly.temperature_2m.slice(start, start + 24)} fmt={fmt} />
            </section>

            <section className="days" aria-label="7-day forecast">
              {d.daily.time.map((day, i) => {
                const [l, ic] = sky(d.daily.weather_code[i]);
                return (
                  <article className="glass day" key={day}>
                    <b>{i === 0 ? "Today" : new Date(day + "T12:00").toLocaleDateString("en-US", { weekday: "short" })}</b>
                    <span className="ic" role="img" aria-label={l}>{ic}</span>
                    <span>{fmt(d.daily.temperature_2m_max[i])}° <small>{fmt(d.daily.temperature_2m_min[i])}°</small></span>
                    <small>💧 {d.daily.precipitation_probability_max[i] ?? 0}%</small>
                  </article>
                );
              })}
            </section>
          </>
        )}
        <footer>Data by Open-Meteo</footer>
      </main>
    </div>
  );
}
