import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE = "https://api.themoviedb.org/3/movie";
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

async function fetchMeta(id) {
  const [details, credits] = await Promise.all([
    fetch(`${BASE}/${id}?api_key=${TMDB_KEY}`).then(r => r.json()),
    fetch(`${BASE}/${id}/credits?api_key=${TMDB_KEY}`).then(r => r.json())
  ]);

  return {
    director: credits?.crew?.find(c => c.job === "Director")?.name || null,
    language: details?.original_language || null
  };
}

export default function Stats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function load() {
      const uid = auth.currentUser.uid;
      const snap = await getDocs(collection(db, "users", uid, "diary"));

      const entries = snap.docs
        .map(d => d.data())
        .filter(e => e.createdAt?.toDate)
        .map(e => ({ ...e, date: e.createdAt.toDate() }))
        .sort((a, b) => a.date - b.date);

      const meta = await Promise.all(entries.map(e => fetchMeta(e.movieId)));

      const byMonth = {};
      const directors = {};
      const languages = {};
      const year = new Date().getFullYear();
      const yearCounts = Array(12).fill(0);

      entries.forEach((e, i) => {
        const y = e.date.getFullYear();
        const m = e.date.getMonth();
        const key = `${y}-${String(m + 1).padStart(2, "0")}`;

        byMonth[key] ??= [];
        byMonth[key].push(e);

        if (y === year) yearCounts[m]++;

        const d = meta[i].director;
        const l = meta[i].language;

        if (d) directors[d] = (directors[d] || 0) + 1;
        if (l) languages[l] = (languages[l] || 0) + 1;
      });

      const months = Object.keys(byMonth).sort();

      setStats({
        total: entries.length,
        avgPerMonth: months.length ? (entries.length / months.length).toFixed(2) : "0",
        firstLatest: months.map(m => {
          const list = byMonth[m];
          return { month: m, first: list[0], latest: list[list.length - 1] };
        }),
        topDirectors: Object.entries(directors).sort((a,b)=>b[1]-a[1]).slice(0,5),
        topLanguages: Object.entries(languages).sort((a,b)=>b[1]-a[1]).slice(0,5),
        yearCounts,
        year
      });
    }

    load();
  }, []);

  if (!stats) return <div className="stats-page">Loading…</div>;

  const max = Math.max(...stats.yearCounts, 1);

  return (
    <div className="stats-page">
      <h2>Stats</h2>

      <div className="stats-cards">
        <Card n={stats.total} l="Total movies" />
        <Card n={stats.avgPerMonth} l="Avg / month" />
      </div>

      <section className="stats-section">
        <h3>{stats.year} by month</h3>
        <div className="bar-chart">
          {stats.yearCounts.map((v, i) => (
            <div key={i} className="bar-col">
                <div
                    className="bar"
                    style={{ height: `${Math.max(8, (v / max) * 120)}px` }}
                    title={`${v} movies`}  
                ></div>
              <span>{MONTHS[i]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="stats-section">
        <h3>First vs latest per month</h3>
        {stats.firstLatest.map(r => (
          <div className="month-shelf">
          <div className="month-label">{r.month}</div>
        
          <div className="poster-pair">
            <div className="poster-item">
              <img src={`https://image.tmdb.org/t/p/w154${r.first.posterPath}`} />
              <span>First</span>
            </div>
        
            <div className="poster-arrow">→</div>
        
            <div className="poster-item">
              <img src={`https://image.tmdb.org/t/p/w154${r.latest.posterPath}`} />
              <span>Latest</span>
            </div>
          </div>
        </div>
        
        ))}
      </section>

      <section className="stats-section">
        <h3>Top directors</h3>
        {stats.topDirectors.map(([d,c]) => (
          <Row key={d} l={d} r={c} />
        ))}
      </section>

      <section className="stats-section">
        <h3>Top languages</h3>
        {stats.topLanguages.map(([l,c]) => (
          <Row key={l} l={l.toUpperCase()} r={c} />
        ))}
      </section>
    </div>
  );
}

const Card = ({ n, l }) => (
  <div className="stats-card">
    <div className="stats-num">{n}</div>
    <div className="stats-label">{l}</div>
  </div>
);

const Row = ({ l, r }) => (
  <div className="stats-row">
    <span>{l}</span>
    <span>{r}</span>
  </div>
);
