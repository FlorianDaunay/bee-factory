import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

/**
 * Screens that want to handle the Android back button (an open modal, the battle's leave
 * prompt) listen for this event and call preventDefault().
 */
export const BACK_EVENT = "bf-back";

export const isNativeApp = () => Capacitor.isNativePlatform();

export function setupNative() {
  if (!isNativeApp()) return;
  void App.addListener("backButton", () => {
    const handled = !window.dispatchEvent(new CustomEvent(BACK_EVENT, { cancelable: true }));
    if (handled) return;
    const route = window.location.hash.replace(/^#/, "") || "/";
    if (route === "/") void App.exitApp();
    else window.history.back();
  });
}
