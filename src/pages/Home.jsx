import { useEffect, useState } from "react";
import { auth, db } from "../firebase";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  deleteDoc,
  doc,
  updateDoc,
  Timestamp
} from "firebase/firestore";

import { posterUrl } from "../api/tmdb";

const TMDB_API_KEY =
  import.meta.env
    .VITE_TMDB_API_KEY;

const TMDB_BASE_URL =
  "https://api.themoviedb.org/3/movie";

async function fetchMovieDetails(
  movieId
) {
  if (
    !TMDB_API_KEY ||
    !movieId
  ) {
    return {
      director: null,
      release_date: null
    };
  }

  try {
    const creditsRes =
      await fetch(
        `${TMDB_BASE_URL}/${movieId}/credits?api_key=${TMDB_API_KEY}`
      );

    const creditsData =
      await creditsRes.json();

    const director =
      creditsData.crew.find(
        m =>
          m.job ===
          "Director"
      )?.name ?? "N/A";

    const detailsRes =
      await fetch(
        `${TMDB_BASE_URL}/${movieId}?api_key=${TMDB_API_KEY}`
      );

    const detailsData =
      await detailsRes.json();

    return {
      director,

      release_date:
        detailsData.release_date ??
        "N/A"
    };
  } catch {
    return {
      director: "Error",
      release_date:
        "Error"
    };
  }
}

export default function Home() {
  const [entries, setEntries] =
    useState([]);

  const [
    editingId,
    setEditingId
  ] = useState(null);

  const [
    editedNotes,
    setEditedNotes
  ] = useState("");

  const [
    editedDate,
    setEditedDate
  ] = useState("");

  async function deleteEntry(
    entryId
  ) {
    if (
      !window.confirm(
        "Are you sure you want to delete this diary entry?"
      )
    ) {
      return;
    }

    const uid =
      auth.currentUser.uid;

    await deleteDoc(
      doc(
        db,
        "users",
        uid,
        "diary",
        entryId
      )
    );
  }

  async function saveEdit(
    entryId
  ) {
    const uid =
      auth.currentUser.uid;

    await updateDoc(
      doc(
        db,
        "users",
        uid,
        "diary",
        entryId
      ),
      {
        notes: editedNotes,

        createdAt:
          Timestamp.fromDate(
            new Date(
              editedDate
            )
          )
      }
    );

    setEditingId(null);
    setEditedNotes("");
    setEditedDate("");
  }

  useEffect(() => {
    if (
      !auth.currentUser
    ) {
      return;
    }

    const ref = collection(
      db,
      "users",
      auth.currentUser.uid,
      "diary"
    );

    const q = query(
      ref,
      orderBy(
        "createdAt",
        "desc"
      )
    );

    const unsub =
      onSnapshot(
        q,
        async snap => {
          const base =
            snap.docs.map(d => ({
              id: d.id,
              ...d.data(),
              director:
                "Loading...",
              release_date:
                "Loading..."
            }));

          setEntries(base);

          const enriched =
            await Promise.all(
              base.map(
                async e => ({
                  ...e,
                  ...(await fetchMovieDetails(
                    e.movieId
                  ))
                })
              )
            );

          setEntries(
            enriched
          );
        }
      );

    return () => unsub();
  }, []);

  if (!entries.length) {
    return (
      <div className="empty-state">
        <p>
          Your diary is
          empty. Find a
          movie and log
          your first
          entry!
        </p>
      </div>
    );
  }

  return (
    <div className="home">
      <h2>
        Your Diary
      </h2>

      {entries.map(e => (
        <div
          key={e.id}
          className="entry-card"
        >
          <div className="entry-top">
            <img
              src={posterUrl(
                e.posterPath
              )}
              alt={e.title}
              className="entry-poster"
            />

            <div className="entry-main">
              <div className="entry-title">
                {e.title}
              </div>

              <div className="entry-meta">
                <p>
                  {e.director}
                </p>

                <p>
                  {
                    e.release_date
                  }
                </p>
              </div>
            </div>

            <div className="entry-actions">
              <button
                className="entry-edit"
                onClick={() => {
                  setEditingId(
                    e.id
                  );

                  setEditedNotes(
                    e.notes ||
                      ""
                  );

                  setEditedDate(
                    e.createdAt
                      ?.toDate
                      ? e.createdAt
                          .toDate()
                          .toISOString()
                          .split(
                            "T"
                          )[0]
                      : ""
                  );
                }}
              >
                Edit
              </button>

              <button
                className="entry-delete"
                onClick={() =>
                  deleteEntry(
                    e.id
                  )
                }
              >
                Delete
              </button>
            </div>
          </div>

          <div className="entry-notes">
            {editingId ===
            e.id ? (
              <>
                <input
                  type="date"
                  className="input"
                  value={
                    editedDate
                  }
                  onChange={ev =>
                    setEditedDate(
                      ev.target
                        .value
                    )
                  }
                />

                <textarea
                  className="diary-textarea"
                  value={
                    editedNotes
                  }
                  onChange={ev =>
                    setEditedNotes(
                      ev.target
                        .value
                    )
                  }
                />

                <div className="entry-edit-actions">
                  <button
                    className="btn"
                    onClick={() =>
                      saveEdit(
                        e.id
                      )
                    }
                  >
                    Save
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditingId(
                        null
                      );

                      setEditedNotes(
                        ""
                      );

                      setEditedDate(
                        ""
                      );
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>
                  <strong>
                    Watched on:
                  </strong>{" "}
                  {e.createdAt
                    ?.toDate()
                    .toLocaleDateString() ||
                    "N/A"}
                </p>

                {e.notes && (
                  <>
                    <strong>
                      Your Notes:
                    </strong>

                    <p className="entry-note-text">
                      {e.notes}
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}