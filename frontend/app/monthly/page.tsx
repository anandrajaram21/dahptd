import { Suspense } from "react";
import MonthlyPage from "./monthly-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="p-8 text-sm text-muted-foreground">
          Loading monthly overview…
        </main>
      }
    >
      <MonthlyPage />
    </Suspense>
  );
}
