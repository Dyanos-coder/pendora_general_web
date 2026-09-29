import 'server-only'
import { prisma } from './db'

/** Journal des actions sur le site (§3, table AuditLog). Best-effort : ne bloque jamais l'action. */
export async function logAudit(accountId: string | null, action: string, target?: string, detail?: string): Promise<void> {
  try {
    await prisma.auditLog.create({ data: { accountId, action, target, detail } })
  } catch (error) {
    console.error('[audit] échec de journalisation', error)
  }
}
