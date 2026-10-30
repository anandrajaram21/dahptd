import { Suspense } from "react";
import DailyPage from "@/components/daily/daily-page";

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-svh place-items-center text-sm text-muted-foreground">
          Loading forecasts…
        </main>
      }
    >
      <DailyPage />
    </Suspense>
  );
}
