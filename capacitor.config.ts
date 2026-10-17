import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.floriandaunay.beefactory",
  appName: "Bee Factory",
  webDir: "dist",
  backgroundColor: "#FFF7E3",
  plugins: {
    SystemBars: {
      // Edge-to-edge; the CSS reads env(safe-area-inset-*) or the injected --safe-area-inset-* fallback.
      insetsHandling: "css",
      initialViewportFitValueHint: "cover",
    },
  },
};

export default config;
