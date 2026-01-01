import { useState } from "react";
import { addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db, serverTimestamp, allowRewatches } from "../firebase";

export default function DiaryEntryForm({ user, movie }) {
  const [notes, setNotes] = useState("");

  async function save() {
    const ref = collection(db, "users", user.uid, "diary");
    const q = query(ref, where("movieId", "==", movie.id));
    const snap = await getDocs(q);

    if (!allowRewatches() && !snap.empty) {
      const existing = snap.docs[0].data();
      const ts = existing.createdAt;
      const watchedDate =
        ts?.toDate?.().toLocaleDateString(undefined, {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }) ?? "an unknown date";

      alert(
        `This movie is already in your diary! You first watched it on ${watchedDate}. Your settings are set to not allow rewatches.`
      );
      setNotes("");
      return;
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
    <div className="diary-form">
      <textarea
        className="diary-textarea"
        placeholder="Notes..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <button className="btn diary-add-btn" onClick={save}>
        Add
      </button>
    </div>
  );
}
