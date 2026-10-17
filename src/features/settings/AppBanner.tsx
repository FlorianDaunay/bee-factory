import { Download, Smartphone, X } from "lucide-react";
import { isNativeApp } from "@/native";
import { useSettings } from "@/store/settings";

/** The site deploy builds the Android app and serves it next to the game, so this link always works. */
export const APK_URL = "./bee-factory.apk";

export const isAndroidWeb = () => /Android/i.test(navigator.userAgent) && !isNativeApp();
export const isIosWeb = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) && !isNativeApp();

/** On an Android phone browsing the website, offer the app download. */
export function AppBanner() {
  const dismissed = useSettings((s) => s.bannerDismissed);
  const set = useSettings((s) => s.set);
  if (dismissed || !isAndroidWeb()) return null;
  return (
    <div className="mx-auto mt-2 flex max-w-5xl items-center gap-2 px-3">
      <a href={APK_URL} download="bee-factory.apk" className="card flex flex-1 items-center gap-2 p-2 font-bold">
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
