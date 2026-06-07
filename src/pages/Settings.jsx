import React, {
  useState,
  useEffect,
  useRef
} from "react";

import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  Timestamp
} from "firebase/firestore";

import {
  auth,
  db,
  allowRewatches
} from "../firebase";

const SETTING_KEY =
  "allowRewatches";

const WATCH_DATE_MODE_KEY =
  "watchDateMode";

const TMDB_KEY =
  import.meta.env
    .VITE_TMDB_API_KEY;

const TMDB_BASE =
  "https://api.themoviedb.org/3";

function parseCSVLine(line) {
  const values = [];

  let current = "";
  let insideQuotes = false;

  for (
    let i = 0;
    i < line.length;
    i++
  ) {
    const char = line[i];

    if (char === '"') {
      if (
        insideQuotes &&
        line[i + 1] === '"'
      ) {
        current += '"';
        i++;
      } else {
        insideQuotes =
          !insideQuotes;
      }

      continue;
    }

    if (
      char === "," &&
      !insideQuotes
    ) {
      values.push(
        current.trim()
      );

      current = "";

      continue;
    }

    current += char;
  }

  values.push(
    current.trim()
  );

  return values.map(value =>
    value.replace(
      /^"|"$/g,
      ""
    )
  );
}

async function resolveTmdbMovie({
  title,
  year
}) {
  if (!TMDB_KEY) {
    return null;
  }

  const url =
    `${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}` +
    `&query=${encodeURIComponent(
      title
    )}` +
    (year
      ? `&year=${year}`
      : "");

  try {
    const res =
      await fetch(url);

    if (!res.ok) {
      return null;
    }

    const data =
      await res.json();

    if (
      !data.results ||
      !data.results.length
    ) {
      return null;
    }

    if (year) {
      const exact =
        data.results.find(
          movie =>
            movie.release_date?.startsWith(
              String(year)
            )
        );

      if (exact) {
        return exact;
      }
    }

    return data.results[0];
  } catch (err) {
    console.error(
      "TMDb search failed",
      err
    );

    return null;
  }
}

function parseLetterboxdDate(
  raw
) {
  if (!raw) {
    return new Date();
  }

  const trimmed =
    raw.trim();

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      trimmed
    )
  ) {
    return new Date(
      trimmed
    );
  }

  if (
    /^\d{2}\/\d{2}\/\d{4}$/.test(
      trimmed
    )
  ) {
    const [
      day,
      month,
      year
    ] =
      trimmed.split("/");

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );
  }

  const parsed =
    new Date(trimmed);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return new Date();
  }

  return parsed;
}

export default function Settings() {
  const [
    importing,
    setImporting
  ] = useState(false);

  const [
    importMessage,
    setImportMessage
  ] = useState("");

  const cancelImportRef =
    useRef(false);

  const [
    allowRewatchesState,
    setAllowRewatchesState
  ] = useState(() => {
    return (
      localStorage.getItem(
        SETTING_KEY
      ) === "true"
    );
  });

  const [
    watchDateMode,
    setWatchDateMode
  ] = useState(() => {
    return (
      localStorage.getItem(
        WATCH_DATE_MODE_KEY
      ) || "first"
    );
  });

  useEffect(() => {
    localStorage.setItem(
      SETTING_KEY,
      allowRewatchesState
        ? "true"
        : "false"
    );
  }, [
    allowRewatchesState
  ]);

  useEffect(() => {
    localStorage.setItem(
      WATCH_DATE_MODE_KEY,
      watchDateMode
    );
  }, [watchDateMode]);

  const user =
    auth.currentUser;

  async function handleLogout() {
    await auth.signOut();
    window.location.reload();
  }

  function validateDiaryCSV(
    file
  ) {
    if (!file) {
      return false;
    }

    const lower =
      file.name.toLowerCase();

    if (
      lower !== "diary.csv"
    ) {
      alert(
        "Only files named diary.csv are allowed."
      );

      return false;
    }

    return true;
  }

  async function importFromLetterboxdCSV(
    file
  ) {
    if (!user) {
      alert(
        "Please sign in before importing."
      );

      return;
    }

    if (
      !validateDiaryCSV(
        file
      )
    ) {
      return;
    }

    try {
      cancelImportRef.current =
        false;

      setImporting(true);

      setImportMessage(
        "Reading diary.csv..."
      );

      const text =
        await file.text();

      const lines = text
        .replace(/\r/g, "")
        .split("\n")
        .filter(line =>
          line.trim()
        );

      if (lines.length < 2) {
        alert(
          "Empty CSV file."
        );

        return;
      }

      const headers =
        parseCSVLine(
          lines[0]
        );

      const ref = collection(
        db,
        "users",
        user.uid,
        "diary"
      );

      let imported = 0;
      let skipped = 0;
      let notFound = 0;

      for (
        let i = 1;
        i < lines.length;
        i++
      ) {
        if (
          cancelImportRef.current
        ) {
          alert(
            `Import cancelled.

Imported: ${imported}
Skipped: ${skipped}
Not found: ${notFound}`
          );

          return;
        }

        setImportMessage(
          `Importing ${i} / ${lines.length - 1}`
        );

        try {
          const values =
            parseCSVLine(
              lines[i]
            );

          const entry = {};

          headers.forEach(
            (
              header,
              index
            ) => {
              entry[
                header
              ] =
                values[
                  index
                ] || "";
            }
          );

          const title =
            entry.Name?.trim();

          const year =
            entry.Year
              ? Number(
                  entry.Year
                )
              : null;

          if (!title) {
            skipped++;
            continue;
          }

          const tmdbMovie =
            await resolveTmdbMovie(
              {
                title,
                year
              }
            );

          if (!tmdbMovie) {
            notFound++;
            continue;
          }

          if (
            !allowRewatches()
          ) {
            const q = query(
              ref,
              where(
                "movieId",
                "==",
                tmdbMovie.id
              )
            );

            const existing =
              await getDocs(
                q
              );

            if (
              !existing.empty
            ) {
              skipped++;
              continue;
            }
          }

          const watchedDate =
            entry[
              "Watched Date"
            ] ||
            entry.Date;

          const parsedDate =
            parseLetterboxdDate(
              watchedDate
            );

          await addDoc(ref, {
            movieId:
              tmdbMovie.id,

            title:
              tmdbMovie.title,

            posterPath:
              tmdbMovie.poster_path ||
              null,

            notes: "",

            createdAt:
              Timestamp.fromDate(
                parsedDate
              )
          });

          imported++;
        } catch (err) {
          console.error(
            err
          );

          skipped++;
        }
      }

      alert(
        `Letterboxd import complete.

Imported: ${imported}
Skipped: ${skipped}
Not found: ${notFound}`
      );
    } catch (err) {
      console.error(err);

      alert(
        "Import failed."
      );
    } finally {
      setImporting(false);

      setImportMessage(
        ""
      );

      cancelImportRef.current =
        false;
    }
  }

  async function importDiaryFromCSV(
    file
  ) {
    if (!user) {
      return;
    }

    if (
      !validateDiaryCSV(
        file
      )
    ) {
      return;
    }

    try {
      cancelImportRef.current =
        false;

      setImporting(true);

      setImportMessage(
        "Importing backup..."
      );

      const text =
        await file.text();

      const lines = text
        .replace(/\r/g, "")
        .split("\n")
        .filter(line =>
          line.trim()
        );

      if (lines.length < 2) {
        alert(
          "Empty CSV file."
        );

        return;
      }

      const headers =
        parseCSVLine(
          lines[0]
        );

      const ref = collection(
        db,
        "users",
        user.uid,
        "diary"
      );

      let imported = 0;

      for (
        let i = 1;
        i < lines.length;
        i++
      ) {
        if (
          cancelImportRef.current
        ) {
          alert(
            `Import cancelled.

Imported: ${imported}`
          );

          return;
        }

        setImportMessage(
          `Importing ${i} / ${lines.length - 1}`
        );

        const values =
          parseCSVLine(
            lines[i]
          );

        const entry = {};

        headers.forEach(
          (
            header,
            index
          ) => {
            entry[
              header
            ] =
              values[
                index
              ] || "";
          }
        );

        await addDoc(ref, {
          movieId: Number(
            entry.movieId
          ),

          title:
            entry.title,

          posterPath:
            entry.posterPath ||
            null,

          notes:
            entry.notes ||
            "",

          createdAt:
            entry.createdAt
              ? Timestamp.fromDate(
                  new Date(
                    entry.createdAt
                  )
                )
              : Timestamp.now()
        });

        imported++;
      }

      alert(
        `Imported ${imported} diary entries.`
      );
    } catch (err) {
      console.error(err);

      alert(
        "Diary import failed."
      );
    } finally {
      setImporting(false);

      setImportMessage(
        ""
      );

      cancelImportRef.current =
        false;
    }
  }

  async function exportDiaryToCSV() {
    if (!user) {
      return;
    }

    const ref = collection(
      db,
      "users",
      user.uid,
      "diary"
    );

    const snap =
      await getDocs(ref);

    const rows = [
      [
        "movieId",
        "title",
        "posterPath",
        "notes",
        "createdAt"
      ]
    ];

    snap.forEach(doc => {
      const d =
        doc.data();

      rows.push([
        d.movieId,
        d.title,
        d.posterPath ||
          "",
        (
          d.notes || ""
        ).replace(
          /\n/g,
          " "
        ),
        d.createdAt?.toDate
          ? d.createdAt
              .toDate()
              .toISOString()
          : ""
      ]);
    });

    const csv = rows
      .map(row =>
        row
          .map(
            value =>
              `"${String(
                value
              ).replace(
                /"/g,
                '""'
              )}"`
          )
          .join(",")
      )
      .join("\n");

    const blob =
      new Blob([csv], {
        type:
          "text/csv;charset=utf-8;"
      });

    const url =
      URL.createObjectURL(
        blob
      );

    const a =
      document.createElement(
        "a"
      );

    a.href = url;

    const today =
      new Date()
        .toISOString()
        .slice(0, 10);

    a.download =
      `cinemma-${today}.csv`;

    a.click();

    URL.revokeObjectURL(
      url
    );
  }

  return (
    <>
      {importing && (
        <div
          style={{
            position:
              "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.82)",
            zIndex: 999999,
            display: "flex",
            flexDirection:
              "column",
            justifyContent:
              "center",
            alignItems:
              "center",
            gap: 24,
            color: "white",
            backdropFilter:
              "blur(6px)"
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              border:
                "5px solid rgba(255,255,255,0.2)",
              borderTop:
                "5px solid white",
              borderRadius:
                "50%",
              animation:
                "spin 1s linear infinite"
            }}
          />

          <div
            style={{
              fontSize: 16,
              fontWeight: 600
            }}
          >
            {importMessage}
          </div>

          <button
            onClick={() => {
              cancelImportRef.current =
                true;
            }}
            style={{
              border: "none",
              background:
                "#ff3131",
              color: "white",
              padding:
                "12px 18px",
              borderRadius: 10,
              cursor:
                "pointer",
              fontWeight: 700
            }}
          >
            Cancel Import
          </button>

          <style>
            {`
              @keyframes spin {
                from {
                  transform: rotate(0deg);
                }

                to {
                  transform: rotate(360deg);
                }
              }
            `}
          </style>
        </div>
      )}

      <div className="settings-page">
        <h2>
          User Settings
        </h2>

        <div className="section">
          <div className="user-info-container user-info-card">
            <table className="user-info-table">
              <tbody>
                <tr>
                  <td className="info-label">
                    Logged in as:
                  </td>

                  <td className="info-value">
                    {
                      user?.email
                    }
                  </td>
                </tr>

                <tr>
                  <td className="info-label">
                    Login Method:
                  </td>

                  <td className="info-value">
                    {
                      user
                        ?.providerData[0]
                        ?.providerId
                    }
                  </td>
                </tr>
              </tbody>
            </table>

            <button
              onClick={
                handleLogout
              }
              className="logout-button logout-btn"
            >
              Log Out
            </button>
          </div>
        </div>

        <div className="section setting-row">
          <label className="setting-label">
            Allow Rewatching Movies
          </label>

          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={
                allowRewatchesState
              }
              onChange={() =>
                setAllowRewatchesState(
                  prev =>
                    !prev
                )
              }
            />

            <span className="slider"></span>
          </label>
        </div>

        <p className="helper-text">
          When disabled,
          duplicate diary
          entries are blocked.
        </p>

        <div className="section setting-row">
          <label className="setting-label">
            Show Most Recent
            Watch
          </label>

          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={
                watchDateMode ===
                "latest"
              }
              onChange={() =>
                setWatchDateMode(
                  prev =>
                    prev ===
                    "first"
                      ? "latest"
                      : "first"
                )
              }
            />

            <span className="slider"></span>
          </label>
        </div>

        <p className="helper-text">
          Rewatches show
          latest watch date.
        </p>

        <div className="section">
          <h3>
            Letterboxd
            Connection
          </h3>

          <p className="helper-text">
            Upload only a
            file named
            diary.csv
          </p>

          <label className="letterboxd-upload">
            Import
            Letterboxd CSV

            <input
              type="file"
              accept=".csv"
              onChange={e => {
                const file =
                  e.target
                    .files?.[0];

                if (file) {
                  importFromLetterboxdCSV(
                    file
                  );

                  e.target.value =
                    "";
                }
              }}
            />
          </label>
        </div>

        <div className="diary-data">
          <div className="diary-header">
            <h3>
              Your Diary
              Entries
            </h3>

            <div className="diary-actions">
              <button
                className="btn btn-secondary"
                onClick={
                  exportDiaryToCSV
                }
              >
                Export
              </button>

              <label className="file-upload">
                Import

                <input
                  type="file"
                  accept=".csv"
                  onChange={e => {
                    const file =
                      e.target
                        .files?.[0];

                    if (file) {
                      importDiaryFromCSV(
                        file
                      );

                      e.target.value =
                        "";
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}