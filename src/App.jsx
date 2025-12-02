// App.jsx
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
    const r = await searchMovies(query);
    setResults(r.results || []);
  }

  function goBack() {
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
            style={{ flex: 1, padding: 10 }}
            placeholder="Search movies..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          
          {isSearching ? (
            <button
              style={{ padding: "10px 14px", background: "gray", color: "white" }}
              onClick={goBack}
            >
              Back
            </button>
          ) : (
            <button
              style={{ padding: "10px 14px", background: "black", color: "white" }}
              onClick={search}
            >
              Go
            </button>
          )}
        </div>

        {results.map((m) => (
          <div
            key={m.id}
            style={{
              marginTop: 20,
              padding: 12,
              border: "1px solid #ccc",
              borderRadius: 6,
            }}
          >
            <img
              src={posterUrl(m.poster_path)}
              style={{ width: 90, borderRadius: 4 }}
            />
            <div style={{ fontWeight: 600, marginTop: 8 }}>{m.title}</div>
            <DiaryEntryForm user={auth.currentUser} movie={m} />
          </div>
        ))}

        {!isSearching && <Home />}
      </>
    );
  };
  
  const navButtonStyle = (target) => ({
    padding: "8px 12px",
    background: page === target ? "darkblue" : "black",
    color: "white",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    marginLeft: 8,
  });


  return (
    <AuthGate>
      <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>Movie Diary</h1>
            <div>
                <button 
                    style={navButtonStyle("home")}
                    onClick={() => setPage("home")}
                >
                    Diary
                </button>
                <button 
                    style={navButtonStyle("settings")}
                    onClick={() => setPage("settings")}
                >
                    Settings
                </button>
            </div>
        </div>

        {renderContent()}

      </div>
    </AuthGate>
  );
}