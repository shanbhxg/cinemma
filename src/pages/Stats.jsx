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
  const [yearFilter, setYearFilter] = useState("all");

  useEffect(() => {
    async function load() {
      const uid = auth.currentUser.uid;
      const snap = await getDocs(collection(db, "users", uid, "diary"));

      const entries = snap.docs
        .map(d => d.data())
        .filter(e => e.createdAt?.toDate)
        .map(e => ({ ...e, date: e.createdAt.toDate() }))
        .sort((a,b)=>a.date-b.date);

      const meta = await Promise.all(entries.map(e => fetchMeta(e.movieId)));

      const byYear = {};
      const allDirectors = {};
      const allLanguages = {};

      entries.forEach((e,i)=>{
        const y = e.date.getFullYear();
        const m = e.date.getMonth();

        byYear[y] ??= {
          entries: [],
          byMonth: {},
          yearCounts: Array(12).fill(0),
          directors: {},
          languages: {}
        };

        const bucket = byYear[y];
        bucket.entries.push(e);
        bucket.yearCounts[m]++;

        const key = `${y}-${String(m+1).padStart(2,"0")}`;
        bucket.byMonth[key] ??= [];
        bucket.byMonth[key].push(e);

        const d = meta[i].director;
        const l = meta[i].language;

        if (d) {
          bucket.directors[d] = (bucket.directors[d]||0)+1;
          allDirectors[d] = (allDirectors[d]||0)+1;
        }
        if (l) {
          bucket.languages[l] = (bucket.languages[l]||0)+1;
          allLanguages[l] = (allLanguages[l]||0)+1;
        }
      });

      setStats({
        entries,
        years: Object.keys(byYear).sort((a,b)=>b-a),
        byYear,
        allDirectors,
        allLanguages
      });
    }
    load();
  }, []);

  if (!stats) return <div className="stats-page">Loading…</div>;

  const isAll = yearFilter === "all";
  const visibleEntries = isAll ? stats.entries : stats.byYear[yearFilter].entries;

  const avgPerMonth = (() => {
    const months = new Set(
      visibleEntries.map(e =>
        `${e.date.getFullYear()}-${e.date.getMonth()}`
      )
    );
    return months.size
      ? (visibleEntries.length / months.size).toFixed(2)
      : "0";
  })();

  const barData = isAll
    ? stats.years.map(y => ({
        label: y,
        value: stats.byYear[y].entries.length
      }))
    : stats.byYear[yearFilter].yearCounts.map((v,i)=>({
        label: MONTHS[i],
        value: v
      }));

  const max = Math.max(...barData.map(b=>b.value),1);

  const topDirectors = Object.entries(
    isAll ? stats.allDirectors : stats.byYear[yearFilter].directors
  ).sort((a,b)=>b[1]-a[1]).slice(0,5);

  const topLanguages = Object.entries(
    isAll ? stats.allLanguages : stats.byYear[yearFilter].languages
  ).sort((a,b)=>b[1]-a[1]).slice(0,5);

  const firstLatest = isAll
    ? []
    : Object.entries(stats.byYear[yearFilter].byMonth).map(([m,list])=>({
        month: m,
        first: list[0],
        latest: list[list.length-1]
      }));

  return (
    <div className="stats-page">
      <h2>Stats</h2>

      <div className="year-switcher">
  <button
    className={yearFilter === "all" ? "active" : ""}
    onClick={() => setYearFilter("all")}
  >
    All
  </button>

  {stats.years.map(y => (
    <button
      key={y}
      className={yearFilter === y ? "active" : ""}
      onClick={() => setYearFilter(y)}
    >
      {y}
    </button>
  ))}
</div>


      <div className="stats-cards">
        <Card n={visibleEntries.length} l="Total movies" />
        <Card n={avgPerMonth} l="Avg / month" />
      </div>

      <section className="stats-section">
        <h3>{isAll ? "Movies per year" : `${yearFilter} by month`}</h3>
        <div className="bar-chart">
          {barData.map((b,i)=>(
            <div key={i} className="bar-col">
              <div
                className="bar"
                style={{ height: `${Math.max(8,(b.value/max)*120)}px` }}
                title={`${b.value} movies`}
              />
              <span>{b.label}</span>
            </div>
          ))}
        </div>
      </section>

      {!isAll && (
        <section className="stats-section">
        <h3>First vs Last per month</h3>
      
        <div className="month-two-col">
          {Array.from({ length: 6 }).map((_, i) => {
            const left = firstLatest[i];
            const right = firstLatest[i + 6];
      
            return (
              <div key={i} className="month-row">
                {[left, right].map(r =>
                  r ? (
                    <div key={r.month} className="month-shelf">
                      <div className="month-label">{`${MONTHS[Number(r.month.split("-")[1])-1]}`}</div>
                      <div className="poster-grid">
                        <div className="poster-item">
                          <img src={`https://image.tmdb.org/t/p/w154${r.first.posterPath}`} />
                          <span>First</span>
                        </div>
                        <div className="poster-item">
                          <img src={`https://image.tmdb.org/t/p/w154${r.latest.posterPath}`} />
                          <span>Last</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="month-shelf empty" />
                  )
                )}
              </div>
            );
          })}
        </div>
      </section>
      
      )}

      <section className="stats-section">
        <h3>Top directors</h3>
        {topDirectors.map(([d,c])=>(
          <Row key={d} l={d} r={c} />
        ))}
      </section>

      <section className="stats-section">
        <h3>Top languages</h3>
        {topLanguages.map(([l,c])=>(
            <Row key={l} l={new Intl.DisplayNames(["en"], { type: "language" }).of(l)} r={c}/>
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
