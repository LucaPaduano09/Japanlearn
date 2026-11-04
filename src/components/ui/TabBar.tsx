"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { strings } from "@/lib/strings";

const tabs = [
  { href: "/", label: strings.tabs.home, glyph: "家" },
  { href: "/learn/", label: strings.tabs.learn, glyph: "学" },
  { href: "/review/", label: strings.tabs.review, glyph: "復" },
  { href: "/write/", label: strings.tabs.write, glyph: "書" },
  { href: "/settings/", label: strings.tabs.settings, glyph: "設" },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 pb-safe backdrop-blur">
      <ul className="mx-auto flex h-16 max-w-lg">
        {tabs.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href.slice(0, -1));
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-0.5 text-xs ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <span className="font-hand text-xl leading-none">
                  {tab.glyph}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
