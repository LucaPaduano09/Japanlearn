import Link from "next/link";
import { strings } from "@/lib/strings";

export default function Home() {
  // Placeholder: the real due count comes from Dexie in M4.
  const due = 0;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-5 py-8 text-center">
      <p className="font-hand text-6xl">{strings.home.greeting}</p>
      <div>
        <h1 className="text-2xl font-semibold">{strings.appName}</h1>
        <p className="mt-1 text-muted">{strings.home.subtitle}</p>
      </div>
      <p className="rounded-full border border-border bg-surface px-4 py-1 text-sm">
        {strings.home.due(due)}
      </p>
      <Link
        href="/review/"
        className="w-full max-w-xs rounded-2xl bg-accent py-4 text-lg font-semibold text-white active:opacity-80"
      >
        {strings.home.start}
      </Link>
    </div>
  );
}
