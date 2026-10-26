'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db'
import { requireAccount } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { PLAN_COLORS, SELLABLE_MODULE_IDS, MODULE_LABEL } from '@/lib/offers'
import { getPlans, itemModules, itemPurchaseCount, subscribedModules } from '@/lib/subscription'
import type { FormState } from './form-state'

// Console › Plans & tarifs (Plan-Gestion-Des-Plans.md) : plans (nom, couleur, points forts, ordre,
// « bientôt », masqué) et leurs éléments facturables (nom, prix, modules, obligatoire, actif, ordre,
// plan). L'identifiant d'un élément ne change jamais : il figure dans les abonnements signés.

/** Erreur inattendue d'une action : écrite dans les journaux du serveur (Vercel › Logs) et affichée
 * dans la page, au lieu d'une erreur 500 qui fait tomber toute la console. */
function serverError(action: string, error: unknown): FormState {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[plans] ${action} a échoué`, error)
  // Dernière ligne non vide du message (Prisma met la cause réelle à la fin).
  const cause = message.split(/\r?\n/).filter((line) => line.trim()).pop()?.slice(0, 300) ?? 'inconnue'
  return { error: `Erreur du serveur : ${cause}` }
}

function refresh(): void {
  revalidatePath('/pricing')
  revalidatePath('/')
  revalidatePath('/hospitals', 'layout')
}

/** Ordre normalisé (0, 1, 2…) puis échange avec le voisin : plus de doublons d'ordre. */
function reorder<T extends { id: string }>(list: T[], id: string, direction: 'up' | 'down'): T[] | null {
  const index = list.findIndex((x) => x.id === id)
  const target = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || target < 0 || target >= list.length) return null
  const next = [...list]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

/** Après le changement, il doit rester au moins un élément obligatoire proposé (décision C). */
async function checkMandatoryRemains(change: {
  planId?: string
  planActive?: boolean
  itemKey?: string
  item?: { mandatory: boolean; active: boolean }
}): Promise<string | null> {
  const plans = await getPlans()
  const remains = plans.some((plan) => {
    const planActive = plan.id === change.planId && change.planActive !== undefined ? change.planActive : plan.active
    return (
      planActive &&
      !plan.comingSoon &&
      plan.items.some((i) => {
        const state = i.key === change.itemKey && change.item ? change.item : i
        return state.mandatory && state.active
      })
    )
  })
  const created = change.itemKey === undefined && change.item?.mandatory && change.item.active
  return remains || created
    ? null
    : 'Il doit toujours rester au moins un élément obligatoire proposé à l’achat (aujourd’hui : Soins & Patients).'
}

// --- Plans -----------------------------------------------------------------------------------

export async function savePlan(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAccount('ADMIN')
  const id = String(formData.get('id') ?? '')
  const name = String(formData.get('name') ?? '')
    .trim()
    .replace(/\s+/g, ' ')
  const color = String(formData.get('color') ?? 'emerald')
  const highlights = String(formData.get('highlights') ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const comingSoon = formData.get('comingSoon') === 'on'
  const active = formData.get('active') === 'on'
  const values = { name, color, highlights: highlights.join('\n'), comingSoon: comingSoon ? 'on' : '', active: active ? 'on' : '' }

  if (!name) return { error: 'Nom du plan requis.', values }
  if (name.length > 120) return { error: 'Nom trop long (120 caractères au plus).', values }
  if (!(PLAN_COLORS as readonly string[]).includes(color)) return { error: 'Couleur invalide.', values }
  if (highlights.length > 12) return { error: '12 points forts au plus.', values }
  // L'application regroupe les éléments par nom de plan : deux plans ne peuvent pas porter le même nom.
  const plans = await getPlans()
  if (plans.some((p) => p.id !== id && p.name.toLocaleLowerCase('fr-FR') === name.toLocaleLowerCase('fr-FR'))) {
    return { error: 'Un autre plan porte déjà ce nom.', values }
  }

  if (!id) {
    const plan = await prisma.plan.create({
      data: { id: randomUUID(), name, color, highlights: JSON.stringify(highlights), comingSoon, active, sortOrder: plans.length }
    })
    await logAudit(admin.id, 'plan.create', plan.id, name)
    refresh()
    return { success: 'Plan créé.' }
  }

  const existing = plans.find((p) => p.id === id)
  if (!existing) return { error: 'Plan introuvable.', values }
  if (!active || comingSoon) {
    const problem = await checkMandatoryRemains({ planId: id, planActive: active && !comingSoon })
    if (problem) return { error: problem, values }
  }
  await prisma.plan.update({ where: { id }, data: { name, color, highlights: JSON.stringify(highlights), comingSoon, active } })
  const changes = [
    existing.name !== name && `nom : « ${existing.name} » → « ${name} »`,
    existing.active !== active && (active ? 'affiché' : 'masqué'),
    existing.comingSoon !== comingSoon && (comingSoon ? 'bientôt disponible' : 'disponible')
  ].filter(Boolean)
  await logAudit(admin.id, 'plan.update', id, changes.join(' ; ') || 'présentation')
  refresh()
  return { success: 'Enregistré.' }
}

export async function movePlan(id: string, direction: 'up' | 'down'): Promise<void> {
  const admin = await requireAccount('ADMIN')
  const next = reorder(await getPlans(), id, direction)
  if (!next) return
  await prisma.$transaction(next.map((plan, sortOrder) => prisma.plan.update({ where: { id: plan.id }, data: { sortOrder } })))
  await logAudit(admin.id, 'plan.move', id, direction === 'up' ? 'monté' : 'descendu')
  refresh()
}

export async function deletePlan(id: string): Promise<FormState> {
  const admin = await requireAccount('ADMIN')
  try {
    const plan = (await getPlans()).find((p) => p.id === id)
    if (!plan) return { error: 'Plan introuvable.' }
    if (plan.items.length > 0) return { error: 'Retirez ou déplacez d’abord les éléments de ce plan.' }
    await prisma.plan.delete({ where: { id } })
    await logAudit(admin.id, 'plan.delete', id, plan.name)
  } catch (error) {
    return serverError('deletePlan', error)
  }
  refresh()
  return { success: 'Plan supprimé.' }
}

// --- Éléments ---------------------------------------------------------------------------------

function newKey(label: string, taken: Set<string>): string {
  const base =
    label
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'element'
  let key = base
  for (let n = 2; taken.has(key); n++) key = `${base}-${n}`
  return key
}

export async function saveItem(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAccount('ADMIN')
  const key = String(formData.get('key') ?? '')
  const planId = String(formData.get('planId') ?? '')
  const label = String(formData.get('label') ?? '')
    .trim()
    .replace(/\s+/g, ' ')
  const price = Number(String(formData.get('price') ?? '').replace(/\s/g, ''))
  const modules = [...new Set(formData.getAll('modules').map(String))].sort()
  const mandatory = formData.get('mandatory') === 'on'
  const active = formData.get('active') === 'on'
  const values = {
    label,
    price: String(formData.get('price') ?? ''),
    modules: modules.join(','),
    mandatory: mandatory ? 'on' : '',
    active: active ? 'on' : ''
  }

  if (!label) return { error: 'Nom requis.', values }
  if (label.length > 120) return { error: 'Nom trop long (120 caractères au plus).', values }
  if (!Number.isInteger(price) || price < 0 || price > 10_000_000) return { error: 'Prix invalide.', values }
  if (modules.length === 0) return { error: 'Choisissez au moins un module.', values }
  if (modules.some((m) => !SELLABLE_MODULE_IDS.includes(m))) return { error: 'Module inconnu.', values }

  const plans = await getPlans()
  const all = plans.flatMap((p) => p.items)
  const existing = key ? all.find((i) => i.key === key) : undefined
  if (key && !existing) return { error: 'Élément introuvable.', values }
  const targetPlan = plans.find((p) => p.id === (existing?.planId ?? planId))
  if (!targetPlan) return { error: 'Plan introuvable.', values }

  // Un module ne peut être vendu que par un seul élément actif (sinon il serait payé deux fois).
  if (active) {
    for (const other of all.filter((i) => i.key !== key && i.active)) {
      const shared = itemModules(other).filter((m) => modules.includes(m))
      if (shared.length > 0) {
        return { error: `${shared.map((m) => MODULE_LABEL[m] ?? m).join(', ')} : déjà vendu par « ${other.label} ».`, values }
      }
    }
  }
  if (existing && (existing.mandatory !== mandatory || existing.active !== active)) {
    const problem = await checkMandatoryRemains({ itemKey: key, item: { mandatory, active } })
    if (problem) return { error: problem, values }
  }

  if (!existing) {
    const created = await prisma.priceItem.create({
      data: {
        key: newKey(label, new Set(all.map((i) => i.key))),
        planId: targetPlan.id,
        label,
        price,
        modules: JSON.stringify(modules),
        mandatory,
        active,
        sortOrder: targetPlan.items.length
      }
    })
    await logAudit(admin.id, 'price_item.create', created.key, `${label} — ${price} F — ${modules.join(', ')}`)
    refresh()
    return { success: 'Élément ajouté.' }
  }

  await prisma.priceItem.update({ where: { key }, data: { label, price, modules: JSON.stringify(modules), mandatory, active } })
  const before = itemModules(existing).sort()
  const changes = [
    existing.label !== label && `nom : « ${existing.label} » → « ${label} »`,
    existing.price !== price && `prix : ${existing.price} → ${price} F`,
    before.join() !== modules.join() && `modules : ${before.join(', ')} → ${modules.join(', ')}`,
    existing.mandatory !== mandatory && (mandatory ? 'obligatoire' : 'facultatif'),
    existing.active !== active && (active ? 'activé' : 'désactivé')
  ].filter(Boolean)
  await logAudit(admin.id, 'price_item.update', key, changes.join(' ; ') || 'aucun changement')
  refresh()
  return { success: 'Enregistré.' }
}

export async function moveItem(key: string, direction: 'up' | 'down'): Promise<void> {
  const admin = await requireAccount('ADMIN')
  const plan = (await getPlans()).find((p) => p.items.some((i) => i.key === key))
  if (!plan) return
  const next = reorder(
    plan.items.map((i) => ({ ...i, id: i.key })),
    key,
    direction
  )
  if (!next) return
  await prisma.$transaction(next.map((item, sortOrder) => prisma.priceItem.update({ where: { key: item.key }, data: { sortOrder } })))
  await logAudit(admin.id, 'price_item.move', key, direction === 'up' ? 'monté' : 'descendu')
  refresh()
}

export async function moveItemToPlan(key: string, planId: string): Promise<FormState> {
  const admin = await requireAccount('ADMIN')
  const plans = await getPlans()
  const from = plans.find((p) => p.items.some((i) => i.key === key))
  const to = plans.find((p) => p.id === planId)
  if (!from || !to) return { error: 'Plan introuvable.' }
  if (from.id === to.id) return undefined
  await prisma.priceItem.update({ where: { key }, data: { planId: to.id, sortOrder: to.items.length } })
  await logAudit(admin.id, 'price_item.move_plan', key, `« ${from.name} » → « ${to.name} »`)
  refresh()
  return { success: `Déplacé vers « ${to.name} ».` }
}

/** Suppression réservée aux éléments dont aucune page n'a jamais été dans un abonnement, premier mois
 * offert compris (§8) ; sinon : désactiver ou déplacer. */
export async function deleteItem(key: string): Promise<FormState> {
  const admin = await requireAccount('ADMIN')
  try {
    const item = (await getPlans()).flatMap((p) => p.items).find((i) => i.key === key)
    if (!item) return { error: 'Élément introuvable.' }
    if ((await itemPurchaseCount(key)) > 0) return { error: 'Cet élément a déjà été acheté : désactivez-le ou déplacez-le plutôt que de le supprimer.' }
    const usage = await subscribedModules({ live: true })
    const used = itemModules(item).filter((module) => usage.hospitalsByModule.has(module))
    if (used.length > 0) {
      const hospitals = [...new Set(used.flatMap((module) => [...usage.hospitalsByModule.get(module)!]))]
      return {
        error: `Déjà dans l’abonnement de ${hospitals.length > 1 ? `${hospitals.length} établissements` : `« ${hospitals[0]} »`} (pages : ${used
          .map((module) => MODULE_LABEL[module] ?? module)
          .join(', ')}) : désactivez-le ou déplacez-le plutôt que de le supprimer.`
      }
    }
    if (usage.unreachable.length > 0) {
      return {
        error: `Vérification impossible pour ${usage.unreachable.join(', ')} (base injoignable) : suppression refusée par précaution. Réessayez plus tard.`
      }
    }
    const problem = await checkMandatoryRemains({ itemKey: key, item: { mandatory: false, active: false } })
    if (problem) return { error: problem }
    await prisma.priceItem.delete({ where: { key } })
    await logAudit(admin.id, 'price_item.delete', key, item.label)
  } catch (error) {
    return serverError('deleteItem', error)
  }
  refresh()
  return { success: 'Élément supprimé.' }
}
