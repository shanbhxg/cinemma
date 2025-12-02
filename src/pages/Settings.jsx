import React, { useState, useEffect } from "react";
import { auth } from "../firebase";

const SETTING_KEY = "allowRewatches";

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
  background-color: #b4dd13;
}

input:focus + .slider {
  box-shadow: 0 0 1px #b4dd13;
}

input:checked + .slider:before {
  -webkit-transform: translateX(26px);
  -ms-transform: translateX(26px);
  transform: translateX(26px);
}
`;

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 15, marginTop: "10px", border: "1px solid #ddd", borderRadius: 6, background: "#f9f9f9" }}>
        <table style={{ borderCollapse: 'collapse', width: '70%' }}>
          <tbody>
            <tr>
              <td style={{ padding: '5px 0', fontWeight: 500, color: "#555", width: '150px' }}>Logged in as:</td>
              <td style={{ padding: '5px 0', fontWeight: 600, color: "#333" }}>{user.email || "N/A"}</td>
            </tr>
            <tr>
              <td style={{ padding: '5px 0', fontWeight: 500, color: "#555" }}>Login Method:</td>
              <td style={{ padding: '5px 0', fontWeight: 600, color: "#333" }}>{getLoginMethod(user.providerData[0]?.providerId)}</td>
            </tr>
          </tbody>
        </table>
        <button
          onClick={handleLogout}
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

    </div>
  );
}