import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader({
  active,
  cutoff,
  readout,
}: {
  active: "daily" | "monthly";
  // Carried between pages so both show the same cutoff.
  cutoff?: string;
  // What the sheet currently shows, e.g. "Fri 16 Jan 2026 · cutoff 10:00".
  readout?: string;
}) {
  const query = cutoff ? `?${new URLSearchParams({ cutoff })}` : "";
  return (
    <header className="bg-band text-band-foreground">
      <div className="mx-auto flex min-h-16 max-w-[90rem] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-8">
        <Link
          href="/"
          className="text-2xl font-extrabold tracking-[-0.03em] focus-visible:outline-band-foreground"
        >
          dahptd
        </Link>
        {readout && (
          <p className="hidden border-l-[1.5px] border-band-foreground/40 pl-5 text-sm leading-tight font-semibold md:block">
            {readout}
          </p>
        )}
        <nav
          aria-label="Main navigation"
          className="ml-auto flex items-center gap-1 text-sm font-semibold"
        >
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
              className={`rounded-full px-4 py-2 transition-colors focus-visible:outline-band-foreground ${active === item.id ? "bg-white text-ring dark:text-band" : "hover:bg-band-foreground/10"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
