import { defineTheme } from "../define";

const shape = {
  radius: { control: "1rem", tile: "1.25rem", card: "1.75rem", pill: "9999px" },
  borderWidth: "2px",
  density: 1,
  fonts: { sans: '"Baloo 2", "Nunito", -apple-system, "Segoe UI", sans-serif' },
};

export default [
  defineTheme({
    id: "honey",
    name: "Honey",
    description: "Bee Factory's own look: cream, honey and soft shadows.",
    scheme: "light",
    colors: {
      canvas: "#FFF7E3",
      surface: "#FFFFFF",
      surfaceHover: "#FFF0C7",
      border: "#F3DFA8",
      textPrimary: "#3A2A12",
      textSecondary: "#6B5530",
      textMuted: "#8E7A55",
      accent: "#E89A00",
      accentForeground: "#2B1B00",
      success: "#2E8B4E",
      warning: "#B26A00",
      danger: "#D9374B",
    },
    ...shape,
    shadow: {
      card: "0 5px 0 0 rgb(120 80 0 / 0.08), 0 12px 24px -10px rgb(232 154 0 / 0.35)",
      overlay: "0 10px 0 0 rgb(120 80 0 / 0.08), 0 24px 48px -12px rgb(232 154 0 / 0.45)",
      control: "0 3px 0 0 rgb(120 80 0 / 0.25)",
      inset: "inset 0 2px 0 0 rgb(120 80 0 / 0.15)",
    },
  }),
  defineTheme({
    id: "honey-night",
    name: "Honey Night",
    description: "The hive after dark: deep brown, glowing honey.",
    scheme: "dark",
    colors: {
      canvas: "#1E160C",
      surface: "#2B2012",
      surfaceHover: "#3A2B17",
      border: "#4A3820",
      textPrimary: "#FFF3D6",
      textSecondary: "#E3CFA4",
      textMuted: "#B49E74",
      accent: "#FFB627",
      accentForeground: "#2B1B00",
      success: "#5BD38A",
      warning: "#FFB547",
      danger: "#FF6B7A",
    },
    ...shape,
    shadow: {
      card: "0 5px 0 0 rgb(0 0 0 / 0.3), 0 12px 24px -10px rgb(255 182 39 / 0.18)",
      overlay: "0 10px 0 0 rgb(0 0 0 / 0.35), 0 24px 48px -12px rgb(255 182 39 / 0.25)",
      control: "0 3px 0 0 rgb(0 0 0 / 0.45)",
      inset: "inset 0 2px 0 0 rgb(0 0 0 / 0.35)",
    },
  }),
];
