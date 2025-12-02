import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebase";

export default function SignIn() {
  return (
    <div style={{ padding: 20 }}>
      <button
        style={{
          padding: "12px 16px",
          background: "black",
          color: "white",
          borderRadius: 6,
          width: "100%",
        }}
        onClick={() => signInWithPopup(auth, provider)}
      >
        Sign in with Google
      </button>
    </div>
  );
}
