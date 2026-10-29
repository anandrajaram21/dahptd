import { Suspense } from "react";
import Dashboard from "./dashboard";

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="main-workspace loading-workspace">
          Loading wind analysis…
        </main>
      }
    >
      <Dashboard />
    </Suspense>
  );
}
