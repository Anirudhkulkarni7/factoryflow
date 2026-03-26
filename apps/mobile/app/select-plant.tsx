import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { Screen } from "../src/ui/Screen";
import { theme } from "../src/ui/theme";
import { apiFetch, getApiErrorMessage } from "../src/lib/api";
import { useAuth } from "../src/auth/session";
import { setSelectedPlantId } from "../src/plant/store";

type Plant = Readonly<{ id: string; name: string }>;

export default function SelectPlant() {
  const router = useRouter();
  const { state, signOut } = useAuth();

  const token = state.status === "signedIn" ? state.token : null;
  const assignedPlantIds = useMemo(
    () =>
      state.status === "signedIn" && Array.isArray(state.user.plantIds)
        ? state.user.plantIds
        : [],
    [state]
  );

  const [rows, setRows] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Back behavior:
  // - If we can go back, go back
  // - If this screen is the first screen (redirect landed here), do NOT exit app.
  //   Instead sign out + go to login (avoids redirect loop).
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (router.canGoBack()) {
          router.back();
          return true;
        }
        void (async () => {
          await signOut();
          router.replace("/login");
        })();
        return true;
      });

      return () => sub.remove();
    }, [router, signOut])
  );

  useEffect(() => {
    if (!token) return;

    void (async () => {
      setLoading(true);
      setErr(null);

      try {
        const res = await apiFetch<any>("/mobile/plants", {
          method: "GET",
          token,
        });

        const items = Array.isArray(res)
          ? res
          : Array.isArray(res?.items)
          ? res.items
          : [];

        const mapped: Plant[] = items.map((p: any) => ({
          id: String(p.id),
          name: String(p.name ?? p.code ?? p.id),
        }));

        setRows(mapped);
      } catch (e) {
        setErr(getApiErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const canShowList = !loading && !err && rows.length > 0;

  // If user has only 1 assigned plant, they should never be “changing plants”
  // (index.tsx already auto-selects). If they somehow land here, send them back.
  useEffect(() => {
    if (assignedPlantIds.length <= 1 && state.status === "signedIn") {
      // If only one plant, go home route resolver
      router.replace("/");
    }
  }, [assignedPlantIds.length, state.status, router]);

  return (
    <Screen>
      <View style={styles.shell}>
        <Text style={styles.title}>Select Plant</Text>
        <Text style={styles.sub}>Choose your working plant</Text>

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading plants…</Text>
          </View>
        )}

        {!!err && <Text style={styles.error}>{err}</Text>}

        {!loading && !err && rows.length === 0 && (
          <Text style={styles.muted}>No plants assigned. Contact admin.</Text>
        )}

        {canShowList && (
          <View style={styles.list}>
            {rows.map((p) => (
              <Pressable
                key={p.id}
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                onPress={async () => {
                  await setSelectedPlantId(p.id);
                  router.replace("/"); // index routes to correct role home
                }}
              >
                <Text style={styles.itemTitle}>{p.name}</Text>
                <Text style={styles.itemMeta}>ID: {p.id}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, padding: theme.spacing.l, justifyContent: "center" },
  title: { color: theme.colors.text, fontSize: 22, fontWeight: "900" },
  sub: { color: theme.colors.muted, marginTop: 6, marginBottom: 16 },

  center: { marginTop: 10, alignItems: "center", gap: 8 },
  muted: { color: theme.colors.muted },
  error: { color: theme.colors.danger, marginTop: 10 },

  list: { marginTop: 12, gap: 10 },
  item: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.xl,
    padding: 14,
  },
  itemPressed: { opacity: 0.85 },
  itemTitle: { color: theme.colors.text, fontWeight: "900", fontSize: 16 },
  itemMeta: { color: theme.colors.muted, marginTop: 4, fontSize: 12 },
});