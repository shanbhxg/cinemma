import { useState, useEffect } from "react";
import AuthGate from "./components/AuthGate";
import { onAuthStateChanged } from "firebase/auth";
import { searchMovies, posterUrl } from "./api/tmdb";
import { collection, onSnapshot, getDocs } from "firebase/firestore";
import { db, auth } from "./firebase";
import DiaryEntryForm from "./components/DiaryEntryForm";
import Home from "./pages/Home";
import Settings from "./pages/Settings"; 
import Stats from "./pages/Stats";
import WatchlistProviders from "./pages/WatchlistProviders";

export default function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [watchedMap, setWatchedMap] = useState({});
  const [page, setPage] = useState("home");

  useEffect(() => {
    let unsubDiary = null;
  
    const unsubAuth = onAuthStateChanged(auth, user => {
      if (!user) {
        setWatchedMap({});
        return;
      }
  
      const ref = collection(db, "users", user.uid, "diary");
  
      unsubDiary = onSnapshot(ref, snap => {
        const temp = {};
  
        snap.forEach(doc => {
          const d = doc.data();
          if (!d?.movieId || !d?.createdAt) return;
  
          const ts = d.createdAt.toDate
            ? d.createdAt.toDate()
            : new Date(d.createdAt);
  
          const id = String(d.movieId);
          if (!temp[id]) temp[id] = [];
          temp[id].push(+ts);
        });
  
        const mode = localStorage.getItem("watchDateMode") || "first";
        const map = {};
  
        Object.entries(temp).forEach(([id, times]) => {
          map[id] = new Date(
            mode === "latest"
              ? Math.max(...times)
              : Math.min(...times)
          );
        });
  
        setWatchedMap(map);
      });
    });
  
    return () => {
      unsubAuth();
      if (unsubDiary) unsubDiary();
    };
  }, []);

  async function search() {
    if (!query.trim()) return;
    const r = await searchMovies(query);
    setResults(r.results || []);
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
  }

  const isSearching = results.length > 0;

  return (
    <AuthGate>
      <div className="container">
        <div className="app-header">
          <img
            src="/header.png"
            alt="Cinemma"
            className="app-header-image"
          />

          <div className="app-nav">
            <button
              className={page === "home" ? "nav-btn active" : "nav-btn"}
              onClick={() => setPage("home")}
            >
              <i class="fa-solid fa-ticket"></i>
            </button>
            <button
              className={page === "stats" ? "nav-btn active" : "nav-btn"}
              onClick={() => setPage("stats")}
            >
              <i class="fa-solid fa-chart-simple"></i>
            </button>
            <button
              className={page === "watchlist" ? "nav-btn active" : "nav-btn"}
              onClick={() => setPage("watchlist")}
            >
              <i className="fa-solid fa-tv"></i>
            </button>
            <button
              className={page === "settings" ? "nav-btn active" : "nav-btn"}
              onClick={() => setPage("settings")}
            >
              <i class="fa-solid fa-gear"></i>
            </button>
          </div>
        </div>

        {page === "settings" ? (
          <Settings />
        ) : page === "stats" ? (
          <Stats />
        ) : page === "watchlist" ? (
          <WatchlistProviders />
        ) : (
          <>
            <div className="search-bar">
              <input
                className="input"
                placeholder="Search movies..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && search()}
              />
              <button className="nav-btn" onClick={search}>🔍</button>
              {isSearching && (
                <button className="nav-btn" onClick={clearSearch}>❌</button>
              )}
            </div>

            {results
              .filter(m => m.poster_path)
              .map(m => (
                <div key={m.id} className="movie-card">
                  <img
                    src={posterUrl(m.poster_path)}
                    alt={m.title}
                    className="movie-poster"
                  />

                  <div className="movie-content">
                    <div className="movie-title-row">
                      <span className="movie-title">{m.title}</span>
                      {watchedMap[m.id] && (
                        <span className="watched-badge">
                          👁{" "}
                          {watchedMap[m.id].toLocaleDateString(undefined, {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit"
                          })}
                        </span>
                      )}
                    </div>

                    {m.release_date && (
                      <div className="movie-meta">{m.release_date}</div>
                    )}

                    {m.overview && (
                      <p className="movie-overview">
                        {m.overview.substring(0, 150)}…
                      </p>
                    )}

                    <DiaryEntryForm user={auth.currentUser} movie={m} />
                  </div>
                </div>
              ))}

            {!isSearching && <Home />}
          </>
        )}
      </div>
    </AuthGate>
  );
}
