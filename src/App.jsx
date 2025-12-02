import { useState } from "react";
import AuthGate from "./components/AuthGate";
import { searchMovies, posterUrl } from "./api/tmdb";
import { auth } from "./firebase";
import DiaryEntryForm from "./components/DiaryEntryForm";
import Home from "./pages/Home";
import Settings from "./pages/Settings"; 

export default function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [page, setPage] = useState("home"); 

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
              <div style={{ fontWeight: 600, fontSize: '1.1em', marginBottom: 5 }}>{m.title}</div>
              
              {m.release_date && (
                <div style={{ fontSize: '0.9em', color: '#666', marginBottom: 10 }}>
                  RELEASE : {m.release_date}
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

      </div>
    </AuthGate>
  );
}