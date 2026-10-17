import { useRef, useState, type ReactNode } from "react";
import { Check, Download, Music, Palette, Save, Trash2, Undo2, Upload, Volume2, VolumeX, X } from "lucide-react";
import { themeToStyle, themes, useActiveTheme, useThemeStore } from "@/themes";
import { exportSave, useGame } from "@/store/game";
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

      <section className="mt-5 space-y-2">
        <span className="flex items-center gap-1.5 font-bold"><Save size={18} /> Save</span>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-sm" onClick={download}>
            <Download size={16} /> Export
          </button>
          <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Import
          </button>
        </div>
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
          <div className={`flex items-center justify-center gap-1 font-bold ${msg === "ok" ? "text-success" : "text-danger"}`}>
            {msg === "ok" ? <><Check size={18} /> Save loaded</> : <><X size={18} /> Invalid file</>}
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
