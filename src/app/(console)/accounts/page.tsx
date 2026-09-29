import { prisma } from '@/lib/db'
import { requireAccount } from '@/lib/auth'
import { Badge, Card, PageTitle, formatDate } from '@/components/ui'
import { AccountActions, CreateAccountForm, RoleSelect } from './AccountForms'

export const metadata = { title: 'Utilisateurs — Pandora' }

export default async function AccountsPage() {
  const me = await requireAccount('ADMIN')
  const accounts = await prisma.account.findMany({ orderBy: [{ role: 'asc' }, { name: 'asc' }] })

  return (
    <>
      <PageTitle
        title="Utilisateurs"
        subtitle="Les comptes créés par inscription sont prospecteurs : promouvez-les en admin ici si besoin."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="overflow-x-auto p-0 lg:col-span-2">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3 font-medium">Compte</th>
                <th className="px-5 py-3 font-medium">Rôle</th>
                <th className="px-5 py-3 font-medium">Dernière connexion</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className={`border-b border-gray-100 last:border-0 ${a.isActive ? '' : 'opacity-50'}`}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    {a.id === me.id ? (
                      <Badge tone="info">Admin (vous)</Badge>
                    ) : (
                      <RoleSelect accountId={a.id} role={a.role} />
                    )}
                    {!a.isActive && <span className="ml-2 text-xs text-gray-500">désactivé</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{formatDate(a.lastLoginAt, true)}</td>
                  <td className="px-5 py-3">
                    {a.id !== me.id && <AccountActions accountId={a.id} isActive={a.isActive} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Nouveau compte</h2>
          <CreateAccountForm />
        </Card>
      </div>
    </>
  )
}
