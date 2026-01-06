'use client';

import { useState } from 'react';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface InscriptionFormData {
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
}

export default function InscriptionPage() {
  const [formData, setFormData] = useState<InscriptionFormData>({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
  });
  const [errors, setErrors] = useState<Partial<InscriptionFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Partial<InscriptionFormData> = {};

    if (!formData.nom.trim()) {
      newErrors.nom = 'Le nom est obligatoire';
    }

    if (!formData.prenom.trim()) {
      newErrors.prenom = 'Le prénom est obligatoire';
    }

    if (!formData.telephone.trim()) {
      newErrors.telephone = 'Le numéro de téléphone est obligatoire';
    } else if (!/^[0-9+\s\-()]+$/.test(formData.telephone)) {
      newErrors.telephone = 'Format de téléphone invalide';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est obligatoire';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Récupérer l'URL du webhook n8n depuis les variables d'environnement
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_INSCRIPTION_WEBHOOK || 
                        'https://n8n.talosprimes.com/webhook/inscription';

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nom: formData.nom.trim(),
          prenom: formData.prenom.trim(),
          telephone: formData.telephone.trim(),
          email: formData.email.trim(),
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi du formulaire');
      }

      setIsSuccess(true);
      // Réinitialiser le formulaire
      setFormData({
        nom: '',
        prenom: '',
        telephone: '',
        email: '',
      });
    } catch (err) {
      setError(
        err instanceof Error 
          ? err.message 
          : 'Une erreur est survenue. Veuillez réessayer.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof InscriptionFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
    // Effacer l'erreur du champ modifié
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 px-4">
        <div className="max-w-md w-full bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-8 backdrop-blur-md text-center">
          <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">
            Demande prise en compte !
          </h2>
          <p className="text-gray-300 mb-2">
            Votre demande d'inscription a bien été reçue.
          </p>
          <p className="text-gray-300 mb-4">
            Vous serez recontacté par l'équipe TalosPrimes dans un délai de <strong className="text-white">24 à 48 heures</strong>.
          </p>
          <p className="text-sm text-gray-400">
            Un email de confirmation vous a été envoyé à l'adresse <strong className="text-gray-300">{formData.email}</strong>.
          </p>
          <button
            onClick={() => {
              setIsSuccess(false);
              setFormData({
                nom: '',
                prenom: '',
                telephone: '',
                email: '',
              });
            }}
            className="mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
          >
            Retour au formulaire
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 px-4 py-12">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">TalosPrimes</h1>
          <p className="text-gray-400">Formulaire d'inscription</p>
        </div>

        {/* Formulaire */}
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-8 backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nom */}
            <div>
              <label htmlFor="nom" className="block text-sm font-medium text-gray-300 mb-2">
                Nom <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="nom"
                value={formData.nom}
                onChange={handleChange('nom')}
                className={`w-full px-4 py-2 bg-gray-800/50 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.nom ? 'border-red-500' : 'border-gray-700'
                }`}
                placeholder="Votre nom"
                disabled={isSubmitting}
              />
              {errors.nom && (
                <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                  <ExclamationCircleIcon className="h-4 w-4" />
                  {errors.nom}
                </p>
              )}
            </div>

            {/* Prénom */}
            <div>
              <label htmlFor="prenom" className="block text-sm font-medium text-gray-300 mb-2">
                Prénom <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="prenom"
                value={formData.prenom}
                onChange={handleChange('prenom')}
                className={`w-full px-4 py-2 bg-gray-800/50 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.prenom ? 'border-red-500' : 'border-gray-700'
                }`}
                placeholder="Votre prénom"
                disabled={isSubmitting}
              />
              {errors.prenom && (
                <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                  <ExclamationCircleIcon className="h-4 w-4" />
                  {errors.prenom}
                </p>
              )}
            </div>

            {/* Téléphone */}
            <div>
              <label htmlFor="telephone" className="block text-sm font-medium text-gray-300 mb-2">
                Numéro de téléphone <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                id="telephone"
                value={formData.telephone}
                onChange={handleChange('telephone')}
                className={`w-full px-4 py-2 bg-gray-800/50 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.telephone ? 'border-red-500' : 'border-gray-700'
                }`}
                placeholder="+33 6 12 34 56 78"
                disabled={isSubmitting}
              />
              {errors.telephone && (
                <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                  <ExclamationCircleIcon className="h-4 w-4" />
                  {errors.telephone}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={handleChange('email')}
                className={`w-full px-4 py-2 bg-gray-800/50 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.email ? 'border-red-500' : 'border-gray-700'
                }`}
                placeholder="votre@email.com"
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                  <ExclamationCircleIcon className="h-4 w-4" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Erreur globale */}
            {error && (
              <div className="bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded-md flex items-center gap-2">
                <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Bouton Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
                isSubmitting
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Envoi en cours...
                </span>
              ) : (
                'Envoyer ma demande'
              )}
            </button>

            <p className="text-xs text-gray-400 text-center">
              En soumettant ce formulaire, vous acceptez que vos données soient utilisées pour vous recontacter.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

