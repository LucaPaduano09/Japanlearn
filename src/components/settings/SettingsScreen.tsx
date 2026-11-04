"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import pkg from "../../../package.json";
import {
  BackupError,
  backupFileName,
  exportBackup,
  importBackup,
  parseBackup,
  type Backup,
} from "@/lib/db/backup";
import { saveTextFile } from "@/lib/native/files";
import { hasJapaneseVoice, speak } from "@/lib/native/tts";
import type { SessionLimits } from "@/lib/srs/queue";
import { STRICTNESS_SCALE, type Strictness } from "@/lib/strokes/compare";
import { strings } from "@/lib/strings";
import { useProgress } from "@/store/progress";
import { useSettings, type Handedness, type Theme } from "@/store/settings";

const t = strings.settings;

/** Bounds and step for each daily-limit stepper. */
const LIMITS: Record<keyof SessionLimits, { min: number; max: number; step: number }> = {
  newPerDay: { min: 0, max: 50, step: 5 },
  newPerSession: { min: 1, max: 20, step: 1 },
  reviews: { min: 5, max: 100, step: 5 },
};

export function SettingsScreen() {
  const s = useSettings();
  // Editing before the stored values arrive would be overwritten by them.
  if (!s.loaded) return null;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6">
      <h1 className="text-2xl font-semibold">{t.title}</h1>

      <Section title={t.writing}>
        <Row label={t.strictness} hint={t.strictnessHint[s.strictness]}>
          <Segmented<Strictness>
            label={t.strictness}
            value={s.strictness}
            options={Object.keys(STRICTNESS_SCALE) as Strictness[]}
            names={t.strictnessOptions}
            onChange={(strictness) => s.update({ strictness })}
          />
        </Row>
        <Row label={t.handedness} hint={t.handednessHint}>
          <Segmented<Handedness>
            label={t.handedness}
            value={s.handedness}
            options={["left", "right"]}
            names={t.handednessOptions}
            onChange={(handedness) => s.update({ handedness })}
          />
        </Row>
      </Section>

      <Section title={t.audio}>
        <Toggle
          label={t.autoplay}
          hint={t.autoplayHint}
          checked={s.autoplayAudio}
          onChange={(autoplayAudio) => s.update({ autoplayAudio })}
        />
        <VoiceStatus />
      </Section>

      <Section title={t.limits}>
        {(
          [
            ["newPerDay", t.newPerDay],
            ["newPerSession", t.newPerSession],
            ["reviews", t.reviews],
          ] as const
        ).map(([key, label]) => (
          <Stepper
            key={key}
            label={label}
            value={s.limits[key]}
            {...LIMITS[key]}
            onChange={(v) => s.update({ limits: { ...s.limits, [key]: v } })}
          />
        ))}
      </Section>

      <Section title={t.appearance}>
        <Row label={t.theme}>
          <Segmented<Theme>
            label={t.theme}
            value={s.theme}
            options={["system", "light", "dark"]}
            names={t.themeOptions}
            onChange={(theme) => s.update({ theme })}
          />
        </Row>
      </Section>

      <Section title={t.backup}>
        <BackupControls />
      </Section>

      <Section title={t.about}>
        <Link
          href="/settings/credits/"
          className="flex items-center justify-between py-1 font-medium active:opacity-70"
        >
          {t.credits}
          <span className="text-muted" aria-hidden>
            →
          </span>
        </Link>
        <p className="text-sm text-muted">{t.version(pkg.version)}</p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">
        {title}
      </h2>
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
        {children}
      </div>
    </section>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-medium">{label}</p>
      {children}
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  names,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  names: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl bg-background p-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={o === value}
          onClick={() => onChange(o)}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${
            o === value ? "bg-accent text-white" : "text-muted active:opacity-70"
          }`}
        >
          {names[o]}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]"
      />
    </label>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const button =
    "h-9 w-9 rounded-full border border-border text-lg font-medium active:opacity-70 disabled:opacity-40";
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-medium">{label}</span>
      <span className="flex items-center gap-3">
        <button
          type="button"
          aria-label={t.decrease(label)}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - step))}
          className={button}
        >
          −
        </button>
        <output className="w-8 text-center tabular-nums" aria-live="polite">
          {value}
        </output>
        <button
          type="button"
          aria-label={t.increase(label)}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + step))}
          className={button}
        >
          +
        </button>
      </span>
    </div>
  );
}

function VoiceStatus() {
  const [voice, setVoice] = useState<boolean | null>(null);
  useEffect(() => {
    hasJapaneseVoice().then(setVoice);
  }, []);
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-muted">
        {voice === null ? t.voiceChecking : voice ? t.voiceOk : t.voiceMissing}
      </p>
      <button
        type="button"
        onClick={() => speak(t.testPhrase)}
        className="shrink-0 rounded-full border border-border px-3 py-1 text-sm font-medium active:opacity-70"
      >
        {t.testVoice}
      </button>
    </div>
  );
}

type BackupState =
  | { kind: "idle" }
  | { kind: "confirm"; backup: Backup }
  | { kind: "message"; text: string; error?: boolean };

function BackupControls() {
  const [state, setState] = useState<BackupState>({ kind: "idle" });
  const input = useRef<HTMLInputElement>(null);

  const onExport = async () => {
    try {
      const backup = await exportBackup();
      await saveTextFile(backupFileName(), JSON.stringify(backup));
      setState({ kind: "message", text: t.exported });
    } catch (err) {
      // Closing the share sheet without picking a target also lands here.
      console.error(err);
      setState({ kind: "message", text: t.exportFailed, error: true });
    }
  };

  const onFile = async (file: File | undefined) => {
    if (input.current) input.current.value = "";
    if (!file) return;
    try {
      const backup = parseBackup(JSON.parse(await file.text()));
      setState({ kind: "confirm", backup });
    } catch (err) {
      const code =
        err instanceof BackupError && err.message in t.importErrors
          ? (err.message as keyof typeof t.importErrors)
          : "unreadable";
      setState({ kind: "message", text: t.importErrors[code], error: true });
    }
  };

  const onReplace = async (backup: Backup) => {
    await importBackup(backup);
    await Promise.all([
      useSettings.getState().load(),
      useProgress.getState().load(),
    ]);
    setState({ kind: "message", text: t.imported });
  };

  return (
    <>
      <p className="text-sm text-muted">{t.backupHint}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onExport}
          className="flex-1 rounded-xl border border-border py-2.5 font-medium active:opacity-70"
        >
          {t.export}
        </button>
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex-1 rounded-xl border border-border py-2.5 font-medium active:opacity-70"
        >
          {t.import}
        </button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          className="hidden"
          data-testid="backup-file"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>

      {state.kind === "confirm" && (
        <div className="rounded-xl border border-accent p-3" role="alertdialog">
          <p className="text-sm">
            {t.importConfirm(
              state.backup.items.length,
              new Date(state.backup.exportedAt).toLocaleDateString(),
            )}
          </p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => onReplace(state.backup)}
              className="flex-1 rounded-xl bg-accent py-2 font-semibold text-white active:opacity-80"
            >
              {t.importReplace}
            </button>
            <button
              type="button"
              onClick={() => setState({ kind: "idle" })}
              className="flex-1 rounded-xl border border-border py-2 font-medium active:opacity-70"
            >
              {t.importCancel}
            </button>
          </div>
        </div>
      )}

      {state.kind === "message" && (
        <p
          role="status"
          className={`text-sm ${state.error ? "text-red-600 dark:text-red-400" : "text-kun"}`}
        >
          {state.text}
        </p>
      )}
    </>
  );
}
