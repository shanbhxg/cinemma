import React, { useState, useEffect } from "react";
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

const SETTING_KEY = "allowRewatches";

const WATCH_DATE_MODE_KEY =
  "watchDateMode";

const TMDB_KEY =
  import.meta.env
    .VITE_TMDB_API_KEY;

const TMDB_BASE =
  "https://api.themoviedb.org/3";

function parseCSVLine(line) {
  const result = [];

  let current = "";
  let inQuotes = false;

  for (
    let i = 0;
    i < line.length;
    i++
  ) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (
        inQuotes &&
        next === '"'
      ) {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (
      char === "," &&
      !inQuotes
    ) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);

  return result.map(v =>
    v.trim()
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
    const res = await fetch(url);

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
    return new Date(trimmed);
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
    ] = trimmed.split("/");

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

async function importFromLetterboxdCSV(
  file,
  user
) {
  if (!user) {
    alert(
      "Please sign in before importing."
    );

    return;
  }

  const text =
    await file.text();

  const lines = text
    .split(/\r?\n/)
    .filter(Boolean);

  if (!lines.length) {
    alert("Empty file.");
    return;
  }

  const [
    header,
    ...rows
  ] = lines;

  const cols =
    parseCSVLine(header);

  const ref = collection(
    db,
    "users",
    user.uid,
    "diary"
  );

  let imported = 0;
  let skipped = 0;
  let notFound = 0;

  for (const row of rows) {
    try {
      const values =
        parseCSVLine(row);

      const entry =
        Object.fromEntries(
          cols.map(
            (col, index) => [
              col,
              values[index]
            ]
          )
        );

      const title =
        entry.Name ||
        entry.Title ||
        entry.Film ||
        entry.Movie;

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
        console.warn(
          "TMDb not found:",
          title,
          year
        );

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

        const snap =
          await getDocs(q);

        if (!snap.empty) {
          skipped++;
          continue;
        }
      }

      const dateRaw =
        entry.Date ||
        entry[
          "Watched Date"
        ] ||
        entry.Watched ||
        entry[
          "Watched On"
        ] ||
        "";

      const watchedAt =
        parseLetterboxdDate(
          dateRaw
        );

      const review =
        entry.Review ||
        entry[
          "Your Review"
        ] ||
        entry[
          "Review Text"
        ] ||
        entry.Notes ||
        "";

      await addDoc(ref, {
        movieId:
          tmdbMovie.id,

        title:
          tmdbMovie.title,

        posterPath:
          tmdbMovie.poster_path ||
          null,

        notes: review,

        createdAt:
          Timestamp.fromDate(
            watchedAt
          )
      });

      imported++;
    } catch (err) {
      console.error(
        "Import row failed",
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
}

async function importDiaryFromCSV(
  file,
  user
) {
  if (!user) {
    alert(
      "Please sign in before importing."
    );

    return;
  }

  const text =
    await file.text();

  const lines = text
    .split(/\r?\n/)
    .filter(Boolean);

  if (!lines.length) {
    alert("Empty file.");
    return;
  }

  const [
    header,
    ...rows
  ] = lines;

  const cols =
    parseCSVLine(header);

  const ref = collection(
    db,
    "users",
    user.uid,
    "diary"
  );

  let imported = 0;

  for (const row of rows) {
    try {
      const values =
        parseCSVLine(row);

      const entry =
        Object.fromEntries(
          cols.map(
            (col, index) => [
              col,
              values[index]
            ]
          )
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
    } catch (err) {
      console.error(
        "Diary import failed",
        err
      );
    }
  }

  alert(
    `Imported ${imported} diary entries.`
  );
}

async function exportDiaryToCSV(
  user
) {
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
    const d = doc.data();

    rows.push([
      d.movieId,
      d.title,
      d.posterPath || "",
      (
        d.notes || ""
      ).replace(/\n/g, " "),
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

  const blob = new Blob(
    [csv],
    {
      type:
        "text/csv;charset=utf-8;"
    }
  );

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

  URL.revokeObjectURL(url);
}

export default function Settings() {
  const [
    allowRewatchesState,
    setAllowRewatchesState
  ] = useState(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return false;
    }

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
    if (
      typeof window ===
      "undefined"
    ) {
      return "first";
    }

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

  const toggleRewatches =
    () => {
      setAllowRewatchesState(
        prev => !prev
      );
    };

  const toggleWatchDateMode =
    () => {
      setWatchDateMode(
        prev =>
          prev === "first"
            ? "latest"
            : "first"
      );
    };

  async function handleLogout() {
    try {
      await auth.signOut();
      window.location.reload();
    } catch (err) {
      console.error(
        "Logout failed",
        err
      );
    }
  }

  function getLoginMethod(
    providerId
  ) {
    switch (providerId) {
      case "password":
        return "Email";

      case "google.com":
        return "Google Sign-In";

      default:
        return (
          providerId || "N/A"
        );
    }
  }

  function renderUserInfo() {
    if (!user) {
      return (
        <p className="helper-text">
          Loading user info...
        </p>
      );
    }

    return (
      <div className="user-info-container user-info-card">
        <table className="user-info-table">
          <tbody>
            <tr>
              <td className="info-label">
                Logged in as:
              </td>

              <td className="info-value">
                {user.email ||
                  "N/A"}
              </td>
            </tr>

            <tr>
              <td className="info-label">
                Login Method:
              </td>

              <td className="info-value">
                {getLoginMethod(
                  user
                    .providerData[0]
                    ?.providerId
                )}
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
    );
  }

  return (
    <div className="settings-page">
      <h2>
        User Settings
      </h2>

      <div className="section">
        {renderUserInfo()}
      </div>

      <div className="section setting-row">
        <label
          htmlFor="rewatch-toggle"
          className="setting-label"
        >
          Allow Rewatching Movies
        </label>

        <label className="toggle-switch">
          <input
            id="rewatch-toggle"
            type="checkbox"
            checked={
              allowRewatchesState
            }
            onChange={
              toggleRewatches
            }
          />

          <span className="slider"></span>
        </label>
      </div>

      <p className="helper-text">
        When set to "No",
        duplicate diary
        entries are blocked.
      </p>

      <div className="section setting-row">
        <label
          htmlFor="watch-date-toggle"
          className="setting-label"
        >
          Show Most Recent
          Watch
        </label>

        <label className="toggle-switch">
          <input
            id="watch-date-toggle"
            type="checkbox"
            checked={
              watchDateMode ===
              "latest"
            }
            onChange={
              toggleWatchDateMode
            }
          />

          <span className="slider"></span>
        </label>
      </div>

      <p className="helper-text">
        When enabled,
        rewatches display
        your latest watch
        date.
      </p>

      <div className="section">
        <h3>
          Letterboxd
          Connection
        </h3>

        <p className="helper-text">
          Export your data
          from Letterboxd
          Settings → Data.
          Upload only the
          diary.csv file.
        </p>

        <label className="letterboxd-upload">
          Import
          Letterboxd CSV

          <input
            type="file"
            accept=".csv"
            onChange={e => {
              if (
                e.target.files?.[0]
              ) {
                importFromLetterboxdCSV(
                  e.target.files[0],
                  user
                );

                e.target.value =
                  "";
              }
            }}
          />
        </label>

        <div className="coming-soon-banner">
          <strong>
            Coming Soon:
          </strong>

          {" "}Direct
          Letterboxd sync.
        </div>
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
              onClick={() =>
                exportDiaryToCSV(
                  user
                )
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
                  if (
                    e.target
                      .files?.[0]
                  ) {
                    importDiaryFromCSV(
                      e.target
                        .files[0],
                      user
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

      <p className="helper-text">
        Export or import
        Cinemma diary CSV
        backups.
      </p>
    </div>
  );
}