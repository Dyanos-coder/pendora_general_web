import Link from 'next/link'
import { AuthShell } from '@/components/AuthShell'
import { LoginForm } from './LoginForm'

export default function LoginPage() {
  return (
    <AuthShell
      title="Connexion"
      subtitle="Espace réservé à l'équipe Pandora."
      footer={
        <>
          Pas encore de compte ?{' '}
          <Link href="/register" className="font-semibold text-[#5fdc8c] hover:text-[#8fe9ae]">
            Créer un compte
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  )
}
