import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, onSnapshot, orderBy, query, deleteDoc, doc } from "firebase/firestore";
import { posterUrl } from "../api/tmdb";

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
    return onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
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
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <img
              src={posterUrl(e.posterPath)}
              style={{ width: 80, borderRadius: 4 }}
            />
            <button
              onClick={() => deleteEntry(e.id)}
              style={{
                background: "darkred",
                color: "white",
                border: "none",
                padding: "4px 8px",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Delete
            </button>
          </div>

          <div style={{ fontWeight: 600, marginTop: 8 }}>{e.title}</div>
          <div style={{ fontSize: 12, color: '#666' }}>
            Watched on: {e.createdAt?.toDate().toLocaleDateString() || 'N/A'}
          </div>
          <div style={{ marginTop: 4 }}>{e.notes}</div>
        </div>
      ))}
    </div>
  );
}