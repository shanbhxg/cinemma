import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";

const SETTING_KEY = "allowRewatches";
const WATCH_DATE_MODE_KEY = "watchDateMode";

const toggleSwitchStyle = `
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: .4s;
  transition: .4s;
  border-radius: 34px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  -webkit-transition: .4s;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:focus + .slider {
  box-shadow: 0 0 1px #2196F3;
}

input:checked + .slider:before {
  -webkit-transform: translateX(26px);
  -ms-transform: translateX(26px);
  transform: translateX(26px);
}

@media (max-width: 600px) {
  .user-info-container {
    flex-direction: column;
    align-items: stretch !important;
  }
  .user-info-table {
    width: 100% !important;
    margin-bottom: 10px;
  }
  .logout-button {
    width: 100%;
    margin-top: 10px;
  }
}
`;

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
        <p style={{ margin: 0 }}>Loading user info...</p>
      );
    }

    return (
      <div className="user-info-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        marginTop: "10px",
        border: "1px solid #ddd",
        borderRadius: 6,
        background: "#f9f9f9"
      }}>
        <table className="user-info-table" style={{ borderCollapse: 'collapse', width: '70%', tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              <td style={{ padding: '5px 0', fontWeight: 500, color: "#555", width: '120px' }}>Logged in as:</td>
              <td style={{ padding: '5px 0', fontWeight: 600, color: "#333", overflowWrap: 'break-word' }}>{user.email || "N/A"}</td>
            </tr>
            <tr>
              <td style={{ padding: '5px 0', fontWeight: 500, color: "#555" }}>Login Method:</td>
              <td style={{ padding: '5px 0', fontWeight: 600, color: "#333" }}>{getLoginMethod(user.providerData[0]?.providerId)}</td>
            </tr>
          </tbody>
        </table>
        <button
          onClick={handleLogout}
          className="logout-button"
          style={{
            padding: "8px 14px",
            background: "#d9534f",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: 600,
            whiteSpace: 'nowrap'
          }}
        >
          Log Out
        </button>
      </div>
    );
  };

  return (
    <div style={{ padding: 20 }}>
      <style>{toggleSwitchStyle}</style>
      <h2>User Settings</h2>

      <div style={{ marginBottom: 20 }}>
        {renderUserInfo()}
      </div>

      <div style={{
        marginTop: 20,
        padding: 15,
        border: "1px solid #ccc",
        borderRadius: 6,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
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
      <p style={{ marginTop: 10, fontSize: 14, color: '#666' }}>
        When set to 'No', you cannot add a movie to your diary if it already exists.
      </p>

      <div
  style={{
    marginTop: 20,
    padding: 15,
    border: "1px solid #ccc",
    borderRadius: 6,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  }}
>
  <label htmlFor="watch-date-toggle" style={{ fontWeight: 600 }}>
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

<p style={{ marginTop: 10, fontSize: 14, color: "#666" }}>
  When enabled, watched dates show your most recent rewatch instead of your first watch.
</p>


      <div style={{
          marginTop: 30,
          padding: 15,
          border: "1px solid #ccc",
          borderRadius: 6
        }}>
        <h3>Diary Data</h3>

        <button
          onClick={() => exportDiaryToCSV(user)}
          style={{ marginRight: 10 }}
        >
          Export CSV
        </button>

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
      </div>

    </div>
  );
}