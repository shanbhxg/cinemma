import React from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import SignIn from "./SignIn";

export default function AuthGate({ children }) {
  const [user, setUser] = React.useState(undefined);

  React.useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  if (user === undefined) return <div style={{ padding: 20 }}>Loading…</div>;
  return user ? children : <SignIn />;
}
