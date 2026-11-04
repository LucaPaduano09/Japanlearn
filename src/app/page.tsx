import Link from "next/link";
import { HomeSummary } from "@/components/home/HomeSummary";
import { strings } from "@/lib/strings";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-5 py-8 text-center">
      <p className="font-hand text-6xl">{strings.home.greeting}</p>
      <div>
        <h1 className="text-2xl font-semibold">{strings.appName}</h1>
        <p className="mt-1 text-muted">{strings.home.subtitle}</p>
      </div>
      <HomeSummary />
      <Link
        href="/review/"
        className="w-full max-w-xs rounded-2xl bg-accent py-4 text-lg font-semibold text-white active:opacity-80"
      >
        {strings.home.start}
      </Link>
    </div>
  );
}
