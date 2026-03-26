import { Stack } from "expo-router";
import { AuthProvider } from "../src/auth/session";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}