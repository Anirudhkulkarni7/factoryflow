import * as SecureStore from "expo-secure-store";

const PLANT_KEY = "ff_selected_plant_id";

export async function getSelectedPlantId(): Promise<string | null> {
  return SecureStore.getItemAsync(PLANT_KEY);
}

export async function setSelectedPlantId(plantId: string): Promise<void> {
  await SecureStore.setItemAsync(PLANT_KEY, plantId);
}

export async function clearSelectedPlantId(): Promise<void> {
  await SecureStore.deleteItemAsync(PLANT_KEY);
}