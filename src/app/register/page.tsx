import Image from 'next/image'
import Link from 'next/link'
import { RegisterForm } from './RegisterForm'

export const metadata = { title: 'Créer un compte — Pandora' }

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-200/60">
        <div className="mb-6 flex items-center gap-3">
          <Image src="/logo.png" alt="Pandora" width={40} height={40} className="rounded-xl" priority />
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight text-gray-900">PANDORA</p>
            <p className="text-xs font-semibold tracking-wide text-accent-600">CONSOLE</p>
          </div>
        </div>
        <h1 className="text-lg font-semibold text-gray-900">Créer un compte</h1>
        <p className="mt-1 mb-6 text-sm text-gray-500">
          Le compte est créé avec le rôle Prospecteur. Un administrateur peut ensuite le promouvoir.
        </p>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-gray-500">
          Déjà un compte ?{' '}
          <Link href="/login" className="font-medium text-accent-600 hover:text-accent-700">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  )
}
