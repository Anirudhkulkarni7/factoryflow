import React, { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { useAuth } from "../src/auth/session";
import { getSelectedPlantId, setSelectedPlantId } from "../src/plant/store";

export default function Index() {
  const { state } = useAuth();
  const [plantId, setPlantIdState] = useState<string | null>(null);
  const [plantLoading, setPlantLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const existing = await getSelectedPlantId();

      if (existing) {
        setPlantIdState(existing);
        setPlantLoading(false);
        return;
      }

      if (state.status === "signedIn") {
        const ids = Array.isArray(state.user.plantIds) ? state.user.plantIds : [];
        if (ids.length === 1) {
          await setSelectedPlantId(ids[0]);
          setPlantIdState(ids[0]);
          setPlantLoading(false);
          return;
        }
      }

      setPlantIdState(null);
      setPlantLoading(false);
    })();
  }, [state.status]);

  if (state.status === "loading" || plantLoading) return null;

  if (state.status !== "signedIn") return <Redirect href="/login" />;

  if (!plantId) return <Redirect href="/select-plant" />;

  if (state.user.role === "MANAGER") return <Redirect href="/(manager)/home" />;
  return <Redirect href="/(user)/home" />;
}