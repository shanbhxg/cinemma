// src/pages/Settings.jsx
import React, { useState, useEffect } from "react";

const SETTING_KEY = "allowRewatches";

export default function Settings() {
  // Initialize state by reading current preference from localStorage
  const [allowRewatches, setAllowRewatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SETTING_KEY) === "true";
  });

  // Effect to save the preference whenever the state changes
  useEffect(() => {
    localStorage.setItem(SETTING_KEY, allowRewatches ? "true" : "false");
  }, [allowRewatches]);

  const toggleRewatches = () => {
    setAllowRewatches(prev => !prev);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>User Settings</h2>
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
        
        <button
          id="rewatch-toggle"
          onClick={toggleRewatches}
          style={{
            padding: "8px 12px",
            background: allowRewatches ? "green" : "gray",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          {allowRewatches ? "Yes" : "No"}
        </button>
      </div>
      <p style={{ marginTop: 10, fontSize: 14, color: '#666' }}>
        When set to 'No', you cannot add a movie to your diary if it already exists.
      </p>
    </div>
  );
}