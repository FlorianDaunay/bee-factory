import { useRef, useState, type ReactNode } from "react";
import { Check, ClipboardPaste, Copy, Download, Music, Palette, Save, Share, Smartphone, Trash2, Undo2, Upload, Volume2, VolumeX, X } from "lucide-react";
import { APK_URL, isAndroidWeb, isIosWeb } from "./AppBanner";
import { themeToStyle, themes, useActiveTheme, useThemeStore } from "@/themes";
import { exportSave, saveCode, useGame } from "@/store/game";
import { isNativeApp } from "@/native";
import { useSettings } from "@/store/settings";
import { Modal } from "@/ui/common";

const FEATURED = ["honey", "honey-night", "bento-playful", "catppuccin-latte", "catppuccin-mocha", "mint", "lavender", "midnight"];

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const settings = useSettings();
  const active = useActiveTheme();
  const { followSystem, selectTheme, setFollowSystem } = useThemeStore();
  const importSave = useGame((s) => s.importSave);
  const reset = useGame((s) => s.reset);
  const [msg, setMsg] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const list = themes.filter((t) => FEATURED.includes(t.id));

  const [code, setCode] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const native = isNativeApp();

  /** The save as a code that can be copied anywhere (the Android app cannot download files). */
  const copyCode = async () => {
    const c = saveCode();
    setCode(c);
    try {
      await navigator.clipboard.writeText(c);
      setMsg("copied");
    } catch {
      setMsg("select");
    }
  };

  const download = () => {
    const blob = new Blob([exportSave()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bee-factory-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Modal onClose={onClose}>
      <h3 className="mb-4 text-xl font-extrabold">Settings</h3>

      <section className="space-y-3">
        <Slider icon={<Music size={20} />} label="Music" value={settings.music} onChange={(music) => settings.set({ music })} />
        <Slider icon={<Volume2 size={20} />} label="Effects" value={settings.sfx} onChange={(sfx) => settings.set({ sfx })} />
        <button className={`btn btn-sm ${settings.muted ? "btn-primary" : ""}`} onClick={() => settings.set({ muted: !settings.muted })}>
          {settings.muted ? <><VolumeX size={16} /> Muted</> : <><Volume2 size={16} /> Sound on</>}
        </button>
      </section>

      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-bold"><Palette size={18} /> Theme</span>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={followSystem} onChange={(e) => setFollowSystem(e.target.checked)} /> Follow system
          </label>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {list.map((t) => (
            <button
              key={t.id}
              style={themeToStyle(t)}
              onClick={() => selectTheme(t.id)}
              className={`flex h-14 flex-col items-center justify-center rounded-tile border-2 bg-canvas text-[10px] font-bold text-text-primary ${active.id === t.id ? "border-accent ring-2 ring-accent" : "border-border"}`}
              title={t.name}
            >
              <span className="h-4 w-8 rounded-pill bg-accent" />
              <span className="mt-1 truncate px-1">{t.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Phone browsers only: the Android app, or how to install the web app on iPhone. Never shown inside the app. */}
      {isAndroidWeb() && (
        <section className="mt-5 space-y-2">
          <span className="flex items-center gap-1.5 font-bold">
            <Smartphone size={18} /> Android app
          </span>
          <a href={APK_URL} download="bee-factory.apk" className="btn btn-primary w-full">
            <Download size={18} /> Download the app (APK)
          </a>
          <p className="text-xs text-text-muted">Your phone may ask to allow installing apps from your browser. Your progress here stays in the browser; use Export / Import below to move it to the app.</p>
        </section>
      )}
      {isIosWeb() && (
        <section className="mt-5 space-y-2">
          <span className="flex items-center gap-1.5 font-bold">
            <Smartphone size={18} /> Install on iPhone
          </span>
          <p className="flex items-center gap-1 text-sm text-text-secondary">
            Tap <Share size={16} /> Share, then "Add to Home Screen".
          </p>
        </section>
      )}

      <section className="mt-5 space-y-2">
        <span className="flex items-center gap-1.5 font-bold"><Save size={18} /> Save</span>
        <div className="grid grid-cols-2 gap-2">
          {!native && (
            <button className="btn btn-sm" onClick={download}>
              <Download size={16} /> Export file
            </button>
          )}
          <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Import file
          </button>
          <button className="btn btn-sm" onClick={copyCode}>
            <Copy size={16} /> Copy save code
          </button>
          <button className="btn btn-sm" onClick={() => setPasting((p) => !p)}>
            <ClipboardPaste size={16} /> Paste save code
          </button>
        </div>
        {code && (
          <textarea
            readOnly
            value={code}
            rows={3}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-tile border border-border bg-canvas p-2 font-mono text-[10px]"
            aria-label="Save code"
          />
        )}
        {pasting && (
          <div className="space-y-1.5">
            <textarea
              value={pasted}
              rows={3}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="Paste your save code here"
              className="w-full rounded-tile border border-border bg-canvas p-2 font-mono text-[10px]"
              aria-label="Paste save code"
            />
            <button
              className="btn btn-sm btn-primary w-full"
              disabled={!pasted.trim()}
              onClick={() => {
                const ok = importSave(pasted.trim());
                setMsg(ok ? "ok" : "error");
                if (ok) {
                  setPasting(false);
                  setPasted("");
                }
              }}
            >
              <Upload size={16} /> Load this save
            </button>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setMsg(importSave(await f.text()) ? "ok" : "error");
          }}
        />
        {msg && (
          <div className={`flex items-center justify-center gap-1 text-center font-bold ${msg === "error" ? "text-danger" : "text-success"}`}>
            {msg === "ok" && <><Check size={18} /> Save loaded</>}
            {msg === "copied" && <><Check size={18} /> Code copied: keep it in a note or a message to yourself</>}
            {msg === "select" && <>Select the code above and copy it</>}
            {msg === "error" && <><X size={18} /> Invalid save</>}
          </div>
        )}
        {confirmReset ? (
          <div className="grid grid-cols-2 gap-2">
            <button className="btn btn-sm" onClick={() => setConfirmReset(false)}>
              <Undo2 size={16} /> Cancel
            </button>
            <button
              className="btn btn-sm !bg-danger !text-white"
              onClick={() => {
                reset();
                setConfirmReset(false);
                onClose();
              }}
            >
              <Trash2 size={16} /> Reset all
            </button>
          </div>
        ) : (
          <button className="btn btn-sm w-full text-danger" onClick={() => setConfirmReset(true)}>
            <Trash2 size={16} /> Reset
          </button>
        )}
      </section>

      <p className="mt-5 text-center text-xs text-text-muted">Bee Factory v{__APP_VERSION__}</p>
    </Modal>
  );
}

function Slider({ icon, label, value, onChange }: { icon: ReactNode; label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-3">
      <span title={label} aria-label={label}>{icon}</span>
      <input type="range" min={0} max={1} step={0.05} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-[rgb(var(--color-accent))]" />
      <span className="w-10 text-right text-sm num">{Math.round(value * 100)}</span>
    </label>
  );
}
