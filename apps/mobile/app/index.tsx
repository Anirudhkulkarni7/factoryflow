import { Redirect } from "expo-router";
import { useAuth } from "../src/auth/session";

export default function Index() {
  const { state } = useAuth();

  if (state.status === "loading") return null;

if (state.status === "signedIn") {
  const role = state.user.role;
  if (role === "MANAGER") return <Redirect href="/(manager)/home" />;
  return <Redirect href="/(user)/home" />;
}

  return <Redirect href="/login" />;
}