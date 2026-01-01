import { useState, useEffect } from "react";
import AuthGate from "./components/AuthGate";
import { searchMovies, posterUrl } from "./api/tmdb";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "./firebase";
import DiaryEntryForm from "./components/DiaryEntryForm";
import Home from "./pages/Home";
import Settings from "./pages/Settings"; 

export default function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [watchedMap, setWatchedMap] = useState({});
  const [page, setPage] = useState("home"); 

  useEffect(() => {
    if (!auth.currentUser) return;
  
    async function loadDiary() {
      const ref = collection(db, "users", auth.currentUser.uid, "diary");
      const snap = await getDocs(ref);
    
      const temp = {};
    
      snap.forEach(doc => {
        const d = doc.data();
        if (!d.movieId || !d.createdAt?.toDate) return;
    
        const date = d.createdAt.toDate();
    
        if (!temp[d.movieId]) {
          temp[d.movieId] = [];
        }
        temp[d.movieId].push(date);
      });
    
      const mode = localStorage.getItem("watchDateMode") || "first";
      const map = {};
    
      Object.entries(temp).forEach(([movieId, dates]) => {
        map[movieId] =
          mode === "latest"
            ? new Date(Math.max(...dates))
            : new Date(Math.min(...dates));
      });
    
      setWatchedMap(map);
    }
    
  
    loadDiary();
  }, []);  

  async function search() {
    if (query.trim()) {
      const r = await searchMovies(query);
      setResults(r.results || []);
    }
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
  }

  const isSearching = results.length > 0;

  const renderContent = () => {
    if (page === "settings") {
      return <Settings />;
    }

    return (
      <>
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <input
            style={{ flex: 1, padding: 10, border: "1px solid #ccc", borderRadius: 4 }}
            placeholder="Search movies..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => { // keypress enter
              if (e.key === 'Enter') {
                search();
              }
            }}
          />
          
          <button
            style={{ 
              padding: "10px 14px", 
              background: "black", 
              color: "white", 
              borderRadius: 4,
              border: 'none',
              fontSize: '1.2em' 
            }}
            onClick={search}
            title="Search"
          >
            🔍
          </button>
          
          {isSearching && (
            <button
              style={{ 
                padding: "10px 14px", 
                background: "black", 
                color: "white", 
                borderRadius: 4,
                border: 'none',
                fontSize: '1.2em' 
              }}
              onClick={clearSearch}
              title="Clear Search"
            >
              ❌
            </button>
          )}
        </div>


        {results
          .filter((m) => m.poster_path) 
          .map((m) => (
          <div
            key={m.id}
            style={{
              marginTop: 20,
              padding: 12,
              border: "1px solid #ccc",
              borderRadius: 6,
              display: "flex",
              gap: 15,
              alignItems: "flex-start",
            }}
          >
            <img
              src={posterUrl(m.poster_path)}
              alt={`${m.title} poster`}
              style={{ width: 90, minWidth: 90, borderRadius: 4 }}
            />
            
            <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: "1.1em", marginBottom: 5, flexWrap: "wrap" }}>
              {m.title}
              {watchedMap[m.id] && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.75em", color: "#666", fontWeight: 500 }}>
                  <i className="fa-solid fa-eye" />
                  <span>
                    {watchedMap[m.id].toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "2-digit" })}
                  </span>
                </span>
              )}
            </div>
              {m.release_date && (
                <div style={{ fontSize: '0.9em', color: '#666', marginBottom: 10 }}>
                  {m.release_date}
                </div>
              )}

              {m.overview && (
                <p style={{ fontSize: '0.9em', color: '#333', marginTop: 0, marginBottom: 15 }}>
                  {m.overview.substring(0, 150)}...
                </p>
              )}

              <DiaryEntryForm user={auth.currentUser} movie={m} />
            </div>
          </div>
        ))}

        {!isSearching && <Home />}
      </>
    );
  };
  
  const navButtonStyle = (target) => ({
    padding: "8px 12px",
    background: page === target ? "rgb(162, 23, 23)" : "black",
    color: "white",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    marginLeft: 8,
    borderBottom: page === target ? "3px solid black" : "none",
    paddingBottom: "9px",
  });

  const logoStyle = {
    fontFamily: "'Oswald', sans-serif",
    fontSize: 40,
    marginBottom: 0,
    color: 'rgb(162, 23, 23)',
    letterSpacing: 3,
    fontWeight: 900,
  };
  
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  
    const btn = document.getElementById('installBtn');
    if (btn) btn.hidden = false;
  });
  
  window.addEventListener('appinstalled', () => {
    const btn = document.getElementById('installBtn');
    if (btn) btn.hidden = true;
  });

  async function installApp() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  }
  
  
  return (
    <AuthGate>
      <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid #eee' }}>
            <h1 style={logoStyle}>Cinemma</h1>
            <div>
                <button 
                    style={navButtonStyle("home")}
                    onClick={() => setPage("home")}
                >
                   📝
                </button>
                <button 
                    style={navButtonStyle("settings")}
                    onClick={() => setPage("settings")}
                >
                    ⚙️
                </button>
            </div>
        </div>

        {renderContent()}
        <button id="installBtn" hidden onClick={installApp}>
  Install App
</button>


      </div>
    </AuthGate>
  );
}