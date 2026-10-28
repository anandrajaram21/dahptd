import { HealthCheck } from "./health-check";

export default function Home() {
  return (
    <main className="mx-auto max-w-[840px] px-6 py-20">
      <p className="text-xs font-bold tracking-widest text-emerald-800">NEXT.JS + FASTAPI</p>
      <h1 className="my-8 text-4xl leading-tight font-bold tracking-tight sm:text-6xl">
        Full-stack starter
      </h1>
      <p className="text-lg leading-relaxed">A Next.js frontend with a Python API.</p>
      <section className="my-9 rounded-2xl border border-stone-200 bg-white p-7" aria-labelledby="status-heading">
        <h2 id="status-heading" className="mb-4 text-2xl font-semibold">Scaffold ready</h2>
        <p className="mb-4 leading-relaxed">Check the connection between the frontend and backend.</p>
        <HealthCheck />
      </section>
    </main>
  );
}
