import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";

const SETTING_KEY = "allowRewatches";
const WATCH_DATE_MODE_KEY = "watchDateMode";

async function importDiaryFromCSV(file, user) {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);

  const [header, ...rows] = lines;
  const cols = header
    .match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)
    .map(c => c.replace(/^"|"$/g, ""));

  const ref = collection(db, "users", user.uid, "diary");

  for (const row of rows) {
    const values = row
      .match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)
      .map(v => v.replace(/^"|"$/g, "").replace(/""/g, '"'));

    const entry = Object.fromEntries(
      cols.map((c, i) => [c, values[i]])
    );

    await addDoc(ref, {
      movieId: Number(entry.movieId),
      title: entry.title,
      posterPath: entry.posterPath || null,
      notes: entry.notes || "",
      createdAt: entry.createdAt
        ? new Date(entry.createdAt)
        : new Date()
    });
  }
}

async function exportDiaryToCSV(user) {
  const ref = collection(db, "users", user.uid, "diary");
  const snap = await getDocs(ref);

  const rows = [
    ["movieId", "title", "posterPath", "notes", "createdAt"]
  ];

  snap.forEach(doc => {
    const d = doc.data();
    rows.push([
      d.movieId,
      d.title,
      d.posterPath || "",
      (d.notes || "").replace(/\n/g, " "),
      d.createdAt?.toDate
        ? d.createdAt.toDate().toISOString()
        : ""
    ]);
  });

  const csv = rows.map(r =>
    r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")
  ).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  const today = new Date().toISOString().slice(0, 10);
  a.download = `cinemma-${today}.csv`;
  a.click();

  URL.revokeObjectURL(url);
}

export default function Settings() {
  const [allowRewatches, setAllowRewatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SETTING_KEY) === "true";
  });

  const [watchDateMode, setWatchDateMode] = useState(() => {
    if (typeof window === "undefined") return "first";
    return localStorage.getItem(WATCH_DATE_MODE_KEY) || "first";
  });

  useEffect(() => {
    localStorage.setItem(WATCH_DATE_MODE_KEY, watchDateMode);
  }, [watchDateMode]);

  const user = auth.currentUser;

  useEffect(() => {
    localStorage.setItem(SETTING_KEY, allowRewatches ? "true" : "false");
  }, [allowRewatches]);

  const toggleRewatches = () => {
    setAllowRewatches(prev => !prev);
  };

  const toggleWatchDateMode = () => {
    setWatchDateMode(prev => (prev === "first" ? "latest" : "first"));
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      window.location.reload();
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const getLoginMethod = (providerId) => {
    switch (providerId) {
      case 'password':
        return 'Email';
      case 'google.com':
        return 'Google Sign-In';
      default:
        return providerId || 'N/A';
    }
  };

  const renderUserInfo = () => {
    if (!user) {
      return (
        <p className="helper-text">Loading user info...</p>
      );
    }

    return (
      <div className="user-info-container user-info-card">
        <table className="user-info-table">
          <tbody>
            <tr>
              <td className="info-label">Logged in as:</td>
              <td className="info-value">{user.email || "N/A"}</td>
            </tr>
            <tr>
              <td className="info-label">Login Method:</td>
              <td className="info-value">{getLoginMethod(user.providerData[0]?.providerId)}</td>
            </tr>
          </tbody>
        </table>
        <button
          onClick={handleLogout}
          className="logout-button logout-btn"
        >
          Log Out
        </button>
      </div>
    );
  };

  return (
    <div className="settings-page">
      <h2>User Settings</h2>

      <div className="section">{renderUserInfo()}</div>

      <div className="section setting-row">
        <label htmlFor="rewatch-toggle" className="setting-label">
          Allow Rewatching Movies
        </label>
        <label className="toggle-switch">
          <input
            id="rewatch-toggle"
            type="checkbox"
            checked={allowRewatches}
            onChange={toggleRewatches}
          />
          <span className="slider"></span>
        </label>
      </div>

      <p className="helper-text">
        When set to 'No', you cannot add a movie to your diary if it already exists.
      </p>

      <div className="section setting-row">
        <label htmlFor="watch-date-toggle" className="setting-label">
          Show Most Recent Watch
        </label>
        <label className="toggle-switch">
          <input
            id="watch-date-toggle"
            type="checkbox"
            checked={watchDateMode === "latest"}
            onChange={toggleWatchDateMode}
          />
          <span className="slider"></span>
        </label>
      </div>

      <p className="helper-text">
        When enabled, watched dates show your most recent rewatch instead of your first watch.
      </p>

      <div className="diary-data">
        <div className="diary-header">
          <h3>Your Diary Entries</h3>

          <div className="diary-actions">
            <button
              className="btn btn-secondary"
              onClick={() => exportDiaryToCSV(user)}
            >
              Export
            </button>

            <label className="file-upload">
              Import
              <input
                type="file"
                accept=".csv"
                onChange={e => {
                  if (e.target.files?.[0]) {
                    importDiaryFromCSV(e.target.files[0], user);
                    e.target.value = "";
                  }
                }}
              />
            </label>
          </div>
        </div>
      </div>

      <p className="helper-text">
        You can export your diary entries to a CSV file for backup or transfer purposes. You can also import diary entries from a CSV file.
      </p>
    </div>
  );
}
