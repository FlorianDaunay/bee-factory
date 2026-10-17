import "@/themes/store"; // applies the saved theme before the first paint
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/baloo-2/500.css";
import "@fontsource/baloo-2/700.css";
import "@fontsource/baloo-2/800.css";
import App from "./App";
import { setupNative } from "./native";
import "./index.css";

setupNative();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
