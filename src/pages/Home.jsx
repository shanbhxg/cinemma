import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { posterUrl } from "../api/tmdb";

export default function Home() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    const uid = auth.currentUser.uid;
    const ref = collection(db, "users", uid, "diary");
    const q = query(ref, orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

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
          <img
            src={posterUrl(e.posterPath)}
            style={{ width: 80, borderRadius: 4 }}
          />
          <div style={{ fontWeight: 600, marginTop: 8 }}>{e.title}</div>
          <div style={{ marginTop: 4 }}>{e.notes}</div>
        </div>
      ))}
    </div>
  );
}
