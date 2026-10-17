import { Download, Smartphone, X } from "lucide-react";
import { isNativeApp } from "@/native";
import { useSettings } from "@/store/settings";

/** The Android workflow attaches this file to every published GitHub release. */
export const APK_URL = "https://github.com/FlorianDaunay/bee-factory/releases/latest/download/bee-factory.apk";

/** Set to false to hide the banner (e.g. while no published release carries an APK). */
export const APK_AVAILABLE = true;

const isAndroid = () => /Android/i.test(navigator.userAgent);

/** On an Android phone browsing the website, offer the app download. */
export function AppBanner() {
  const dismissed = useSettings((s) => s.bannerDismissed);
  const set = useSettings((s) => s.set);
  if (!APK_AVAILABLE || dismissed || !isAndroid() || isNativeApp()) return null;
  return (
    <div className="mx-auto mt-2 flex max-w-5xl items-center gap-2 px-3">
      <a href={APK_URL} className="card flex flex-1 items-center gap-2 p-2 font-bold">
        <Smartphone size={26} />
        <span className="flex-1">Get the Android app</span>
        <span className="btn btn-primary btn-sm"><Download size={16} /> APK</span>
      </a>
      <button className="btn btn-sm" onClick={() => set({ bannerDismissed: true })} aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}
