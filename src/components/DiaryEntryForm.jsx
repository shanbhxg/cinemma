import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db, serverTimestamp } from "../firebase";

export default function DiaryEntryForm({ user, movie }) {
  const [notes, setNotes] = useState("");

  async function save() {
    const ref = collection(db, "users", user.uid, "diary");
    await addDoc(ref, {
      movieId: movie.id,
      title: movie.title,
      posterPath: movie.poster_path,
      notes,
      createdAt: serverTimestamp(),
    });
    setNotes("");
    alert("Added to diary!");
  }

  return (
    <div style={{ marginTop: 10 }}>
      <textarea
        style={{ width: "100%", padding: 10, minHeight: 60 }}
        placeholder="Notes..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <button
        onClick={save}
        style={{
          marginTop: 8,
          padding: "8px 12px",
          background: "black",
          color: "white",
          borderRadius: 4,
        }}
      >
        Add
      </button>
    </div>
  );
}
