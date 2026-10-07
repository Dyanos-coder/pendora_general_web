import Link from 'next/link'
import { AuthShell } from '@/components/AuthShell'
import { RegisterForm } from './RegisterForm'

export const metadata = { title: 'Créer un compte — Pandora' }

export default function RegisterPage() {
  return (
    <AuthShell
      title="Créer un compte"
      subtitle="Le compte est créé avec le rôle Prospecteur. Un administrateur peut ensuite le promouvoir."
      footer={
        <>
          Déjà un compte ?{' '}
          <Link href="/login" className="font-semibold text-[#5fdc8c] hover:text-[#8fe9ae]">
            Se connecter
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  )
}
