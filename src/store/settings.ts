import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  music: number;
  sfx: number;
  muted: boolean;
  /** Install banner dismissed. */
  bannerDismissed: boolean;
  /** Battle controls, kept from one fight to the next. */
  battleAuto: boolean;
  battleFast: boolean;
  /** Tutorial tips already shown (shown once each). */
  tipsSeen: string[];
  seeTip: (id: string) => void;
  set: (patch: Partial<Omit<SettingsState, "set" | "seeTip">>) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      music: 0.5,
      sfx: 0.7,
      muted: false,
      bannerDismissed: false,
      battleAuto: false,
      battleFast: false,
      tipsSeen: [],
      seeTip: (id) => set((s) => (s.tipsSeen.includes(id) ? s : { tipsSeen: [...s.tipsSeen, id] })),
      set: (patch) => set(patch),
    }),
    { name: "beefactory-settings", version: 1 },
  ),
);
