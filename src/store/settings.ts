import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  music: number;
  sfx: number;
  muted: boolean;
  /** Install banner dismissed. */
  bannerDismissed: boolean;
  set: (patch: Partial<Omit<SettingsState, "set">>) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      music: 0.5,
      sfx: 0.7,
      muted: false,
      bannerDismissed: false,
      set: (patch) => set(patch),
    }),
    { name: "beefactory-settings", version: 1 },
  ),
);
