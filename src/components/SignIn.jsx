import { useState } from "react";
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { auth, provider } from "../firebase";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleSignIn = () => {
    setError(null);
    signInWithPopup(auth, provider).catch(err => setError(err.message));
  };

  return (
    <div style={containerStyle}>
      <h1 style={logoStyle}>CINEMMA</h1>
      <h2 style={titleStyle}>{isRegistering ? "Create Account" : "Sign In"}</h2>

      <form onSubmit={handleAuth}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />
        {error && <p style={errorStyle}>{error}</p>}
        <button
          type="submit"
          style={{ ...buttonStyle, background: isRegistering ? "#4B6CB7" : "#1F1F1F" }}
        >
          {isRegistering ? "Register" : "Sign In"}
        </button>
      </form>

      <div style={orStyle}>— OR —</div>

      <button
        style={{ ...buttonStyle, background: "#DB4437", marginTop: 5 }}
        onClick={handleGoogleSignIn}
      >
        Sign in with Google
      </button>

      <div style={toggleStyle}>
        {isRegistering ? "Already have an account? " : "Don't have an account? "}
        <button
          onClick={() => setIsRegistering(!isRegistering)}
          style={toggleButtonStyle}
        >
          {isRegistering ? "Sign In" : "Register"}
        </button>
      </div>
    </div>
  );
}

const containerStyle = {
  padding: 30,
  maxWidth: 380,
  margin: "80px auto",
  borderRadius: 12,
  background: "#fafafa",
  // Removed boxShadow for a borderless look
  boxShadow: "none", 
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const logoStyle = {
  fontFamily: "'Oswald', sans-serif", 
  fontSize: 40, 
  marginBottom: 20,
  color: 'rgb(220, 45, 45)', 
  letterSpacing: 4, 
  fontWeight: 900, 
  textShadow: "1px 1px rgb(56, 13, 13), 2px 2px rgb(255, 174, 0), 3px 3px rgb(99, 3, 3), 4px 4px 3px rgba(53, 43, 43, 0.7)",
};

const titleStyle = {
  fontSize: 22,
  marginBottom: 25,
  color: "#333",
};

const inputStyle = {
  width: "100%",
  padding: 14,
  marginBottom: 15,
  border: "1px solid #ddd",
  borderRadius: 8,
  fontSize: 15,
  outline: "none",
  transition: "border 0.2s",
};

const buttonStyle = {
  padding: "12px 16px",
  color: "white",
  borderRadius: 8,
  width: "100%",
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 15,
  transition: "background 0.3s",
};

const errorStyle = {
  color: "#D8000C",
  fontSize: 13,
  marginBottom: 10,
  textAlign: "center",
};

const orStyle = {
  textAlign: "center",
  margin: "12px 0",
  color: "#999",
  fontWeight: 500,
};

const toggleStyle = {
  textAlign: "center",
  marginTop: 22,
  fontSize: 14,
  color: "#555",
};

const toggleButtonStyle = {
  background: "none",
  border: "none",
  color: "#4B6CB7",
  cursor: "pointer",
  padding: 0,
  fontWeight: 600,
};