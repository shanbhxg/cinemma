import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";

const SETTING_KEY = "allowRewatches";

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
    const entry = Object.fromEntries(cols.map((c, i) => [c, values[i]]));
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
  const rows = [["movieId", "title", "posterPath", "notes", "createdAt"]];
  snap.forEach(doc => {
    const d = doc.data();
    rows.push([
      d.movieId,
      d.title,
      d.posterPath || "",
      (d.notes || "").replace(/\n/g, " "),
      d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : ""
    ]);
  });
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
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

  const user = auth.currentUser;

  useEffect(() => {
    localStorage.setItem(SETTING_KEY, allowRewatches ? "true" : "false");
  }, [allowRewatches]);

  const toggleRewatches = () => {
    setAllowRewatches(prev => !prev);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  const getLoginMethod = (providerId) => {
    switch (providerId) {
      case "password":
        return "Email";
      case "google.com":
        return "Google Sign-In";
      default:
        return providerId || "N/A";
    }
  };

  const renderUserInfo = () => {
    if (!user) {
      return <p style={{ margin: 0 }}>Loading user info...</p>;
    }

    return (
      <div className="user-info-panel">
        <table className="user-info-table">
          <tbody>
            <tr>
              <td style={{ fontWeight: 500, color: "#555", width: "120px" }}>Logged in as:</td>
              <td style={{ fontWeight: 600, color: "#333", overflowWrap: "break-word" }}>{user.email || "N/A"}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500, color: "#555" }}>Login Method:</td>
              <td style={{ fontWeight: 600, color: "#333" }}>{getLoginMethod(user.providerData[0]?.providerId)}</td>
            </tr>
          </tbody>
        </table>
        <button onClick={handleLogout} className="logout-button">Log Out</button>
      </div>
    );
  };

  return (
    <div className="settings-container">
      <h2>User Settings</h2>

      <div style={{ marginBottom: 20 }}>
        {renderUserInfo()}
      </div>

      <div className="panel">
        <label htmlFor="rewatch-toggle" style={{ fontWeight: 600 }}>
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

      <p className="panel-note">
        When enabled, you can log multiple watches for the same movie in your diary.
      </p>

      <div className="panel">
        <label htmlFor="watch-date-toggle" style={{ fontWeight: 600 }}>
          Show Most Recent Watch
        </label>

        <label className="toggle-switch">
          <input
            id="watch-date-toggle"
            type="checkbox"
            checked={false}
            onChange={() => {}}
          />
          <span className="slider"></span>
        </label>
      </div>

      <p className="panel-note">
        When enabled, watched dates show your most recent rewatch instead of your first watch.
      </p>

      <div className="csv-panel">
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>CSV Data</h3>

        <div className="csv-actions">
          <button className="btn btn-primary" onClick={() => exportDiaryToCSV(user)}>
            Export CSV
          </button>

          <label className="btn btn-danger" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            Import CSV
            <input type="file" accept=".csv" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) { importDiaryFromCSV(e.target.files[0], user); e.target.value = ""; } }} />
          </label>
        </div>
      </div>
    </div>
  );
}
