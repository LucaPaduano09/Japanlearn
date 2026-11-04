import { strings } from "@/lib/strings";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="mx-auto w-full max-w-lg px-5 py-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted">{strings.placeholder}</p>
    </div>
  );
}
