export default function InvalidSpacePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-6">🚫</div>
        <h1 className="text-3xl font-bold text-white mb-4">
          Espace introuvable
        </h1>
        <p className="text-gray-400 mb-8">
          Ce sous-domaine ne correspond à aucun espace client actif.
          <br />
          Vérifiez l&apos;adresse ou contactez votre administrateur.
        </p>
        <a
          href="https://talosprimes.com"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          Retour à TalosPrimes
        </a>
      </div>
    </div>
  );
}
