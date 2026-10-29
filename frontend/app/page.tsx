import { Suspense } from "react";
import ForecastPage from "./forecast-page";

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-svh place-items-center text-sm text-muted-foreground">
          Loading forecasts…
        </main>
      }
    >
      <ForecastPage />
    </Suspense>
  );
}
