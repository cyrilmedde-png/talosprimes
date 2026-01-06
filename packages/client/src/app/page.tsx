export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          TalosPrimes
        </h1>
        <p className="text-center text-xl">
          Plateforme SaaS de gestion d&apos;entreprise orchestrée par n8n
        </p>
        <p className="text-center mt-4 text-gray-600">
          Frontend configuré avec Next.js 14 (App Router)
        </p>
      </div>
    </main>
  );
}

