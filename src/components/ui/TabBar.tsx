"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { strings } from "@/lib/strings";

/** Screens that take the whole display: one thing at a time, no tab bar. */
const FOCUSED = ["/stage", "/welcome", "/learn/intro"];

export function TabBar() {
  const pathname = usePathname();
  if (FOCUSED.some((p) => pathname.startsWith(p))) return null;

  const tabs = [
    { href: "/", label: strings.tabs.path, glyph: "道", match: (p: string) => p === "/" },
    { href: "/review/", label: strings.tabs.review, glyph: "復", match: (p: string) => p.startsWith("/review") },
    {
      href: "/settings/",
      label: strings.tabs.profile,
      glyph: "私",
      match: (p: string) => ["/settings", "/write", "/kanji"].some((x) => p.startsWith(x)),
    },
  ];

  return (
    <>
      {/* Keeps page content clear of the fixed bar. */}
      <div aria-hidden className="h-[calc(4rem+env(safe-area-inset-bottom))] shrink-0" />
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 pb-safe backdrop-blur">
        <ul className="mx-auto flex h-16 max-w-lg">
          {tabs.map((tab) => {
            const active = tab.match(pathname);
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-full flex-col items-center justify-center gap-0.5 text-xs ${
                    active ? "text-accent" : "text-muted"
                  }`}
                >
                  <span className="font-hand text-xl leading-none">{tab.glyph}</span>
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
