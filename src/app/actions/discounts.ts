'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAccount } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { describeTiers, sortTiers, validateTiers, type DiscountTierRule } from '@/lib/discount-math'
import { getDiscountTiers } from '@/lib/subscription'
import type { FormState } from './form-state'

// Console › Plans & tarifs › Réductions selon le nombre d'éléments (Plan-Reductions-Abonnement.md).
// La liste complète des paliers est remplacée d'un coup ; s'applique aux prochains devis et paiements.

export async function saveDiscountTiers(input: DiscountTierRule[]): Promise<FormState> {
  const admin = await requireAccount('ADMIN')
  if (!Array.isArray(input)) return { error: 'Paliers invalides.' }
  const tiers = sortTiers(input.map((t) => ({ minItems: Number(t?.minItems), percent: Number(t?.percent) })))
  const error = validateTiers(tiers)
  if (error) return { error }

  const before = await getDiscountTiers()
  await prisma.$transaction([
    prisma.discountTier.deleteMany({}),
    ...tiers.map((t) => prisma.discountTier.create({ data: { minItems: t.minItems, percent: t.percent } }))
  ])
  await logAudit(
    admin.id,
    'discount.update',
    undefined,
    `${before.length ? describeTiers(before) : 'aucune réduction'} → ${tiers.length ? describeTiers(tiers) : 'aucune réduction'}`
  )
  revalidatePath('/pricing')
  revalidatePath('/')
  revalidatePath('/hospitals', 'layout')
  return { success: tiers.length ? 'Réductions enregistrées : elles s’appliquent aux prochains paiements.' : 'Réductions supprimées.' }
}
