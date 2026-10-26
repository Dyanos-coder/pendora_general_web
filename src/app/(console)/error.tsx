'use client'

import { RotateCw } from 'lucide-react'
import { Card, buttonPrimary } from '@/components/ui'

// Erreur dans une page de la console : message en français au lieu de la page générique de Next.js.
// Cas le plus fréquent : la page était ouverte avant une mise en ligne, et ses boutons appellent des
// actions de l'ancienne version, qui n'existent plus sur le serveur — un rechargement suffit.

export default function ConsoleError({ error }: { error: Error & { digest?: string } }) {
  const outdated = /server action/i.test(error.message)
  return (
    <Card className="mx-auto mt-16 max-w-lg text-center">
      <h1 className="text-base font-semibold text-gray-900">
        {outdated ? 'La console vient d’être mise à jour' : 'Cette page a rencontré une erreur'}
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        {outdated
          ? 'Cette page a été ouverte avant la nouvelle version du site. Rechargez-la, puis recommencez votre action.'
          : 'Rechargez la page. Si le problème continue, notez la référence ci-dessous.'}
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-gray-400">Référence : {error.digest}</p>}
      <div className="mt-5 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={buttonPrimary}
        >
          <RotateCw className="h-4 w-4" />
          Recharger la page
        </button>
      </div>
    </Card>
  )
}
