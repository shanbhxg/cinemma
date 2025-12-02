import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, onSnapshot, orderBy, query, deleteDoc, doc } from "firebase/firestore";
import { posterUrl } from "../api/tmdb"; 

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY; 

const TMDB_BASE_URL = "https://api.themoviedb.org/3/movie";

async function fetchMovieDetails(movieId) {
  if (!TMDB_API_KEY || !movieId) {
    console.warn("Missing TMDb API Key or Movie ID.");
    return { director: null, release_date: null };
  }

  try {
    const creditsRes = await fetch(
      `${TMDB_BASE_URL}/${movieId}/credits?api_key=${TMDB_API_KEY}`
    );
    const creditsData = await creditsRes.json();
    
    const director = creditsData.crew.find(
      (member) => member.job === "Director"
    )?.name || 'N/A';
    const detailsRes = await fetch(
      `${TMDB_BASE_URL}/${movieId}?api_key=${TMDB_API_KEY}`
    );
    const detailsData = await detailsRes.json();
    
    const release_date = detailsData.release_date || 'N/A';

    return { director, release_date };

  } catch (error) {
    console.error("Error fetching movie details from TMDb:", error);
    return { director: 'Error', release_date: 'Error' };
  }
}

export default function Home() {
  const [entries, setEntries] = useState([]);

  async function deleteEntry(entryId) {
    if (!window.confirm("Are you sure you want to delete this diary entry?")) {
      return;
    }

    try {
      const uid = auth.currentUser.uid;
      const docRef = doc(db, "users", uid, "diary", entryId);

      await deleteDoc(docRef);
      console.log("Document successfully deleted with ID:", entryId);
    } catch (error) {
      console.error("Error deleting document: ", error);
      alert("Failed to delete entry. Check console for details.");
    }
  }

  useEffect(() => {
    if (!auth.currentUser) return;

    const uid = auth.currentUser.uid;
    const ref = collection(db, "users", uid, "diary");
    const q = query(ref, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, async (snap) => {
      const fetchedEntries = snap.docs.map((d) => ({ 
        id: d.id, 
        ...d.data(), 
        director: 'Loading...', 
        release_date: 'Loading...',
      }));
      
      setEntries(fetchedEntries);
      const updatedEntries = await Promise.all(
        fetchedEntries.map(async (entry) => {
          const { director, release_date } = await fetchMovieDetails(entry.movieId); 
          return { ...entry, director, release_date };
        })
      );
      
      setEntries(updatedEntries);
    });

    return () => unsubscribe();
  }, []); 

  if (entries.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '40vh',
        textAlign: 'center',
        padding: 20
      }}>
        <p style={{
          fontSize: '1.2rem',
          color: '#666',
          fontStyle: 'italic'
        }}>
          Your diary is empty. Find a movie and log your first entry!
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Your Diary</h2>

      {entries.map((e) => (
        <div
          key={e.id}
          style={{
            marginTop: 15,
            padding: 12,
            border: "1px solid #ccc",
            borderRadius: 6,
            backgroundColor: '#f9f9f9', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <img
              src={posterUrl(e.posterPath)}
              alt={e.title}
              style={{ width: 80, height: 120, objectFit: 'cover', borderRadius: 4 }}
            />
            
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>{e.title}</div>
              
              <div style={{ fontSize: 12,  color: 'rgba(55, 55, 55, 0.8)' }}>
                <p style={{ margin: 0 }}>
                  {e.director}
                </p>
                <p style={{ margin: '2px 0 0 0' }}>
                   {e.release_date}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => deleteEntry(e.id)}
              style={{
                background: "#c0392b", 
                color: "white",
                border: "none",
                padding: "6px 10px",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 12,
                alignSelf: 'flex-start', 
                fontWeight: 600
              }}
            >
              Delete
            </button>
          </div>

          <div style={{ 
              marginTop: 12, 
              paddingTop: 10, 
              borderTop: '1px dashed #ddd', 
              fontSize: '0.95rem',
              lineHeight: 1.4,
              color: '#333'
            }}>
                <p style={{ margin: '4px 0 0 0' }}>
                    <strong style={{ color: '#000' }}>Watched on:</strong> {e.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                </p>
                {e.notes && (
                  <>
                    <strong style={{ display: 'block', marginBottom: 4, color: '#000', marginTop: 8 }}>Your Notes:</strong>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{e.notes}</p>
                  </>
                )}
          </div>
        </div>
      ))}
    </div>
  );
}