import { useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;

const BASE = "https://api.themoviedb.org/3/movie";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

async function fetchMeta(id) {
  const [details, credits] = await Promise.all([
    fetch(`${BASE}/${id}?api_key=${TMDB_KEY}`).then(r => r.json()),
    fetch(`${BASE}/${id}/credits?api_key=${TMDB_KEY}`).then(r => r.json())
  ]);

  return {
    director:
      credits?.crew?.find(
        c => c.job === "Director"
      )?.name || null,

    language:
      details?.original_language ||
      null,

    actors:
      credits?.cast
        ?.slice(0, 10)
        ?.map(a => a.name) || []
  };
}

export default function Stats() {
  const [stats, setStats] =
    useState(null);

  const [yearFilter, setYearFilter] =
    useState("all");

  const [selectedGroup, setSelectedGroup] =
    useState(null);

  useEffect(() => {
    async function load() {
      const uid =
        auth.currentUser.uid;

      const snap =
        await getDocs(
          collection(
            db,
            "users",
            uid,
            "diary"
          )
        );

      const entries =
        snap.docs
          .map(d => ({
            id: d.id,
            ...d.data()
          }))
          .filter(
            e =>
              e.createdAt?.toDate
          )
          .map(e => ({
            ...e,
            date:
              e.createdAt.toDate()
          }))
          .sort(
            (a, b) =>
              a.date - b.date
          );

      const meta =
        await Promise.all(
          entries.map(e =>
            fetchMeta(e.movieId)
          )
        );

      const byYear = {};

      const allDirectors = {};
      const allLanguages = {};
      const allActors = {};

      entries.forEach((e, i) => {
        const y =
          e.date.getFullYear();

        const m =
          e.date.getMonth();

        byYear[y] ??= {
          entries: [],
          byMonth: {},
          yearCounts:
            Array(12).fill(0),

          directors: {},
          languages: {},
          actors: {}
        };

        const bucket =
          byYear[y];

        bucket.entries.push(e);

        bucket.yearCounts[m]++;

        const monthKey =
          `${y}-${String(
            m + 1
          ).padStart(2, "0")}`;

        bucket.byMonth[
          monthKey
        ] ??= [];

        const enriched = {
          ...e,
          meta: meta[i]
        };

        bucket.byMonth[
          monthKey
        ].push(enriched);

        const director =
          meta[i].director;

        const language =
          meta[i].language;

        const actors =
          meta[i].actors;

        if (director) {
          bucket.directors[
            director
          ] ??= [];

          allDirectors[
            director
          ] ??= [];

          bucket.directors[
            director
          ].push(enriched);

          allDirectors[
            director
          ].push(enriched);
        }

        if (language) {
          bucket.languages[
            language
          ] ??= [];

          allLanguages[
            language
          ] ??= [];

          bucket.languages[
            language
          ].push(enriched);

          allLanguages[
            language
          ].push(enriched);
        }

        actors.forEach(actor => {
          bucket.actors[
            actor
          ] ??= [];

          allActors[
            actor
          ] ??= [];

          bucket.actors[
            actor
          ].push(enriched);

          allActors[
            actor
          ].push(enriched);
        });
      });

      setStats({
        entries,
        years:
          Object.keys(byYear).sort(
            (a, b) => b - a
          ),

        byYear,

        allDirectors,
        allLanguages,
        allActors
      });
    }

    load();
  }, []);

  if (!stats) {
    return (
      <div className="stats-page">
        Loading...
      </div>
    );
  }

  const isAll =
    yearFilter === "all";

  const visibleEntries =
    isAll
      ? stats.entries
      : stats.byYear[
          yearFilter
        ].entries;

  const avgPerMonth =
    (() => {
      const months = new Set(
        visibleEntries.map(
          e =>
            `${e.date.getFullYear()}-${e.date.getMonth()}`
        )
      );

      return months.size
        ? (
            visibleEntries.length /
            months.size
          ).toFixed(2)
        : "0";
    })();

  const barData = isAll
    ? stats.years.map(y => ({
        label: y,
        value:
          stats.byYear[y]
            .entries.length
      }))
    : stats.byYear[
        yearFilter
      ].yearCounts.map(
        (v, i) => ({
          label: MONTHS[i],
          value: v
        })
      );

  const max = Math.max(
    ...barData.map(
      b => b.value
    ),
    1
  );

  function getTop(data) {
    return Object.entries(data)
      .sort(
        (a, b) =>
          b[1].length -
          a[1].length
      )
      .slice(0, 8);
  }

  const topDirectors =
    getTop(
      isAll
        ? stats.allDirectors
        : stats.byYear[
            yearFilter
          ].directors
    );

  const topLanguages =
    getTop(
      isAll
        ? stats.allLanguages
        : stats.byYear[
            yearFilter
          ].languages
    );

  const topActors =
    getTop(
      isAll
        ? stats.allActors
        : stats.byYear[
            yearFilter
          ].actors
    );

  const monthlyMovies =
    !isAll
      ? Object.entries(
          stats.byYear[
            yearFilter
          ].byMonth
        )
      : [];

  return (
    <div className="stats-page">
      <h2>Stats</h2>

      <div className="year-switcher">
        <button
          className={
            yearFilter === "all"
              ? "active"
              : ""
          }
          onClick={() =>
            setYearFilter("all")
          }
        >
          All
        </button>

        {stats.years.map(y => (
          <button
            key={y}
            className={
              yearFilter === y
                ? "active"
                : ""
            }
            onClick={() =>
              setYearFilter(y)
            }
          >
            {y}
          </button>
        ))}
      </div>

      <div className="stats-cards">
        <Card
          n={visibleEntries.length}
          l="Total movies"
        />

        <Card
          n={avgPerMonth}
          l="Avg / month"
        />
      </div>

      <section className="stats-section">
        <h3>
          {isAll
            ? "Movies per year"
            : `${yearFilter} by month`}
        </h3>

        <div className="bar-chart">
          {barData.map((b, i) => (
            <div
              key={i}
              className="bar-col"
            >
              <div
                className="bar"
                style={{
                  height: `${Math.max(
                    8,
                    (b.value /
                      max) *
                      120
                  )}px`
                }}
              />

              <span>
                {b.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {!isAll && (
        <section className="stats-section">
          <h3>
            Movies watched by
            month
          </h3>

          <div className="monthly-list">
            {monthlyMovies.map(
              ([month, list]) => (
                <div
                  key={month}
                  className="monthly-block"
                >
                  <div className="month-label">
                    {
                      MONTHS[
                        Number(
                          month.split(
                            "-"
                          )[1]
                        ) - 1
                      ]
                    }
                  </div>

                  <div className="movie-grid">
                    {list.map(movie => (
                      <div
                        key={movie.id}
                        className="movie-mini"
                      >
                        <img
                          src={`https://image.tmdb.org/t/p/w154${movie.posterPath}`}
                        />

                        <span>
                          {
                            movie.title
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      )}

<section className="stats-section">
  <h3>Top directors</h3>

  <div className="stats-list-grid">
    {topDirectors.map(
      ([name, movies]) => (
        <button
          key={name}
          className="stats-person-card"
          onClick={() =>
            setSelectedGroup({
              title: name,
              movies
            })
          }
        >
          <div className="stats-person-name">
            {name}
          </div>

          <div className="stats-person-count">
            {movies.length} movies
          </div>
        </button>
      )
    )}
  </div>
</section>

<section className="stats-section">
  <h3>Top actors</h3>

  <div className="stats-list-grid">
    {topActors.map(
      ([name, movies]) => (
        <button
          key={name}
          className="stats-person-card"
          onClick={() =>
            setSelectedGroup({
              title: name,
              movies
            })
          }
        >
          <div className="stats-person-name">
            {name}
          </div>

          <div className="stats-person-count">
            {movies.length} movies
          </div>
        </button>
      )
    )}
  </div>
</section>

<section className="stats-section">
  <h3>Top languages</h3>

  <div className="stats-list-grid">
    {topLanguages.map(
      ([name, movies]) => (
        <button
          key={name}
          className="stats-person-card"
          onClick={() =>
            setSelectedGroup({
              title:
                new Intl.DisplayNames(
                  ["en"],
                  {
                    type:
                      "language"
                  }
                ).of(name),
              movies
            })
          }
        >
          <div className="stats-person-name">
            {
              new Intl.DisplayNames(
                ["en"],
                {
                  type:
                    "language"
                }
              ).of(name)
            }
          </div>

          <div className="stats-person-count">
            {movies.length} movies
          </div>
        </button>
      )
    )}
  </div>
</section>

      {selectedGroup && (
        <div className="stats-modal-overlay">
          <div className="stats-modal">
            <div className="stats-modal-top">
              <h3>
                {
                  selectedGroup.title
                }
              </h3>

              <button
                onClick={() =>
                  setSelectedGroup(
                    null
                  )
                }
              >
                ✕
              </button>
            </div>

            <div className="movie-grid">
              {selectedGroup.movies.map(
                movie => (
                  <div
                    key={
                      movie.id +
                      movie.date
                    }
                    className="movie-mini"
                  >
                    <img
                      src={`https://image.tmdb.org/t/p/w154${movie.posterPath}`}
                    />

                    <span>
                      {movie.title}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Card = ({ n, l }) => (
  <div className="stats-card">
    <div className="stats-num">
      {n}
    </div>

    <div className="stats-label">
      {l}
    </div>
  </div>
);

const ClickableRow = ({
  l,
  r,
  onClick
}) => (
  <button
    className="stats-row clickable"
    onClick={onClick}
  >
    <span>{l}</span>
    <span>{r}</span>
  </button>
);