import { useState } from "react";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth, provider } from "../firebase";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState(null);

  async function handleAuth(e) {
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
  }

  function handleGoogleSignIn() {
    setError(null);
    signInWithPopup(auth, provider).catch(err => setError(err.message));
  }

  return (
    <div className="auth-container">
      <img
        src="/header.png"
        alt="Cinemma"
        className="auth-header-image"
      />

      <form className="auth-form" onSubmit={handleAuth}>
        <input
          className="input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        {error && <p className="auth-error">{error}</p>}

        <button className="btn auth-primary" type="submit">
          {isRegistering ? "Register" : "Sign In"}
        </button>
      </form>

      <div className="auth-divider">— OR —</div>

      <button className="btn auth-google" onClick={handleGoogleSignIn}>
        Sign in with Google
      </button>

      <div className="auth-toggle">
        {isRegistering ? "Already have an account? " : "Don't have an account? "}
        <button
          className="auth-toggle-btn"
          onClick={() => setIsRegistering(!isRegistering)}
        >
          {isRegistering ? "Sign In" : "Register"}
        </button>
      </div>
    </div>
  );
}
