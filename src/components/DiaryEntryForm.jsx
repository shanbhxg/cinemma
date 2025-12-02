import { useState } from "react";
import { addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db, serverTimestamp, allowRewatches} from "../firebase";

export default function DiaryEntryForm({ user, movie }) {
  const [notes, setNotes] = useState("");

  async function save() {
    const ref = collection(db, "users", user.uid, "diary");
    // if movie already exists and rewatches not allowed, alert user and return

    const q = query(ref, where("movieId", "==", movie.id));
    const querySnapshot = await getDocs(q);

    if (!allowRewatches()) {
      if (!querySnapshot.empty) {
        const existingEntry = querySnapshot.docs[0].data();
        const timestamp = existingEntry.createdAt;

        let watchedDate = "an unknown date";
        
        if (timestamp && timestamp.toDate) {
          watchedDate = timestamp.toDate().toLocaleDateString(undefined, {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          });
        }
        alert(`This movie is already in your diary! You first watched it on ${watchedDate}. Your settings are set to not allow rewatches.`);
        setNotes(""); 
        return;
      }
    }

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