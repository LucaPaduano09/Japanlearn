import Link from "next/link";
import { strings } from "@/lib/strings";

const t = strings.credits;

/** Attribution required by the data and font licenses (BOOTSTRAP §9). */
export default function CreditsPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 py-6">
      <Link href="/settings/" className="text-sm text-accent">
        ← {t.back}
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{t.title}</h1>
        <p className="mt-1 text-muted">{t.intro}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {t.items.map((item) => (
          <li
            key={item.name}
            className="rounded-2xl border border-border bg-surface p-4"
          >
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-accent"
            >
              {item.name}
            </a>
            <p className="mt-1 text-sm">{item.what}</p>
            <p className="mt-1 text-sm text-muted">{item.by}</p>
            <a
              href={item.licenseUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block rounded-full border border-border px-2.5 py-0.5 text-xs font-medium"
            >
              {item.license}
            </a>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">{t.shareAlike}</p>
    </div>
  );
}
