'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAccount } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { describeRules, sortTiers, validateRules, type DiscountRuleDef } from '@/lib/discount-math'
import { getDiscountRules, planNames } from '@/lib/subscription'
import type { FormState } from './form-state'

// Console › Plans & tarifs › Réductions (Plan-Reductions-Abonnement.md §8) : règles (portée + paliers).
// L'ensemble est remplacé d'un coup ; s'applique aux prochains devis et paiements.

export async function saveDiscountRules(input: DiscountRuleDef[]): Promise<FormState> {
  const admin = await requireAccount('ADMIN')
  if (!Array.isArray(input)) return { error: 'Règles invalides.' }
  const known = new Set((await prisma.plan.findMany({ select: { id: true } })).map((p) => p.id))
  const rules: DiscountRuleDef[] = input.map((r) => ({
    id: typeof r?.id === 'string' && r.id ? r.id : randomUUID(),
    planIds: [...new Set(Array.isArray(r?.planIds) ? r.planIds.filter((id) => typeof id === 'string') : [])],
    tiers: sortTiers((Array.isArray(r?.tiers) ? r.tiers : []).map((t) => ({ minItems: Number(t?.minItems), percent: Number(t?.percent) })))
  }))
  const nameOf = await planNames()
  if (rules.some((r) => r.planIds.some((id) => !known.has(id)))) return { error: 'Une section choisie n’existe plus : rechargez la page.' }
  const error = validateRules(rules, nameOf)
  if (error) return { error }

  const before = await getDiscountRules()
  await prisma.$transaction([
    prisma.discountRule.deleteMany({}),
    ...rules.map((r, index) =>
      prisma.discountRule.create({
        data: { id: r.id, planIds: JSON.stringify(r.planIds), sortOrder: index, tiers: { create: r.tiers } }
      })
    )
  ])
  await logAudit(
    admin.id,
    'discount.update',
    undefined,
    `${before.length ? describeRules(before, nameOf) : 'aucune réduction'} → ${rules.length ? describeRules(rules, nameOf) : 'aucune réduction'}`
  )
  revalidatePath('/pricing')
  revalidatePath('/')
  revalidatePath('/hospitals', 'layout')
  return { success: rules.length ? 'Réductions enregistrées : elles s’appliquent aux prochains paiements.' : 'Réductions supprimées.' }
}
