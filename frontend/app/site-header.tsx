import Link from "next/link";

export function SiteHeader({
  active,
  cutoff,
}: {
  active: "daily" | "monthly";
  // Carried between pages so both show the same cutoff.
  cutoff?: string;
}) {
  const query = cutoff ? `?${new URLSearchParams({ cutoff })}` : "";
  return (
    <header className="border-b">
      <div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="font-medium tracking-tight">
          dahptd
        </Link>
        <nav aria-label="Main navigation" className="flex gap-1 text-sm">
          {[
            { id: "daily", href: `/${query}`, label: "Daily forecast" },
            {
              id: "monthly",
              href: `/monthly${query}`,
              label: "Monthly overview",
            },
          ].map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active === item.id ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 ${active === item.id ? "bg-secondary font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
