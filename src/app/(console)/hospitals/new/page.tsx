import { requireAccount } from '@/lib/auth'
import { Card, PageTitle } from '@/components/ui'
import { HospitalForm } from '../HospitalForm'

export const metadata = { title: 'Ajouter un hôpital — Pandora' }

export default async function NewHospitalPage() {
  await requireAccount('ADMIN')
  return (
    <>
      <PageTitle
        title="Ajouter un hôpital"
        subtitle="Accès à la base de données de l'hôpital. L'identifiant de l'hôpital est le nom d'utilisateur de sa base."
      />
      <Card className="max-w-2xl">
        <HospitalForm />
      </Card>
    </>
  )
}
