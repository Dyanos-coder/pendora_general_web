'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from 'lucide-react'
import { deleteItem, deletePlan, moveItem, moveItemToPlan, movePlan, saveItem, savePlan } from '@/app/actions/plans'
import type { FormState } from '@/app/actions/form-state'
import { useConfirm } from '@/components/ConfirmDialog'
import { PLAN_COLOR_CHOICES, SELLABLE_MODULES, MODULE_LABEL, colorFamily, type PlanColor } from '@/lib/offers'
import { Badge, Card, FormMessage, buttonPrimary, buttonSecondary, formatFcfa, inputClass, labelClass } from '@/components/ui'

// Console › Plans & tarifs (Plan-Gestion-Des-Plans.md) : un bloc par plan, ses éléments facturables
// en dessous. Tout changement s'applique aux prochains paiements ; ce qui est payé reste acquis.

export interface EditorItem {
  key: string
  label: string
  price: number
  modules: string[]
  mandatory: boolean
  active: boolean
  /** Établissements dont l'abonnement en cours (dernier paiement) contient l'élément. */
  current: number
  /** Paiements qui l'ont acheté : s'il y en a, l'élément ne peut plus être supprimé. */
  purchases: number
  /** Une de ses pages a déjà été dans un abonnement (premier mois offert compris) : non supprimable. */
  subscribed: boolean
}

export interface EditorPlan {
  id: string
  name: string
  color: PlanColor
  highlights: string[]
  comingSoon: boolean
  active: boolean
  items: EditorItem[]
}

// Mêmes familles que la page d'accueil (src/app/page.tsx, OFFER_STYLE).
const DOT: Record<PlanColor, string> = {
  emerald: 'bg-accent-500',
  green: 'bg-accent-500',
  orange: 'bg-gold-500',
  pink: 'bg-gold-500',
  teal: 'bg-teal-500',
  violet: 'bg-teal-500',
  sky: 'bg-blue-500',
  indigo: 'bg-blue-500'
}

/** Appel d'une action depuis un bouton : un échec (page ouverte avant une mise en ligne, réseau,
 * serveur) devient un message dans la page au lieu de faire tomber la console. */
async function safeCall(action: () => Promise<FormState>): Promise<FormState> {
  try {
    return await action()
  } catch {
    return { error: 'Action impossible : rechargez la page (le site a peut-être été mis à jour), puis recommencez.' }
  }
}

const iconButton =
  'inline-grid h-8 w-8 place-items-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent'

export function PlansEditor({ plans }: { plans: EditorPlan[] }) {
  const [creating, setCreating] = useState(false)
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className={buttonPrimary}>
            <Plus className="h-4 w-4" />
            Nouveau plan
          </button>
        )}
      </div>
      {creating && (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Nouveau plan</h2>
          <PlanForm onDone={() => setCreating(false)} />
        </Card>
      )}
      {plans.map((plan, index) => (
        <PlanCard key={plan.id} plan={plan} first={index === 0} last={index === plans.length - 1} plans={plans} />
      ))}
    </div>
  )
}

function PlanCard({ plan, first, last, plans }: { plan: EditorPlan; first: boolean; last: boolean; plans: EditorPlan[] }) {
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<FormState>(undefined)
  const [confirmDialog, confirm] = useConfirm()
  const unit = plan.items.length === 1 ? 'forfait' : plan.items.length > 1 ? 'à la carte' : 'vide'

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-3">
        <span className={`h-3 w-3 shrink-0 rounded-full ${DOT[plan.color]}`} />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">
          {plan.name} <span className="ml-1 text-xs font-normal text-gray-400">· {unit}</span>
        </h2>
        {!plan.active && <Badge tone="warning">Masqué</Badge>}
        {plan.comingSoon && <Badge tone="neutral">Bientôt</Badge>}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title="Monter le plan"
            aria-label="Monter le plan"
            disabled={first || pending}
            onClick={() => startTransition(() => movePlan(plan.id, 'up'))}
            className={iconButton}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Descendre le plan"
            aria-label="Descendre le plan"
            disabled={last || pending}
            onClick={() => startTransition(() => movePlan(plan.id, 'down'))}
            className={iconButton}
          >
            <ArrowDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Modifier le plan"
            aria-label="Modifier le plan"
            onClick={() => setEditing((v) => !v)}
            className={iconButton}
          >
            {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </button>
          {plan.items.length === 0 && (
            <button
              type="button"
              title="Supprimer le plan"
              aria-label="Supprimer le plan"
              disabled={pending}
              onClick={async () => {
                const ok = await confirm({
                  title: 'Supprimer le plan',
                  message: <>Le plan « {plan.name} » sera supprimé. Il est vide : aucun élément ni abonnement n’est touché.</>,
                  confirmLabel: 'Supprimer',
                  danger: true
                })
                if (ok) startTransition(async () => setMessage(await safeCall(() => deletePlan(plan.id))))
              }}
              className={`${iconButton} hover:bg-red-50 hover:text-red-600`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {message && (
        <div className="px-5 pt-3">
          <FormMessage state={message} />
        </div>
      )}

      {editing && (
        <div className="border-b border-gray-100 bg-gray-50/60 px-5 py-4">
          <PlanForm plan={plan} onDone={() => setEditing(false)} />
        </div>
      )}

      {plan.highlights.length > 0 && (
        <p className="px-5 pt-3 text-xs text-gray-500">
          <span className="font-medium text-gray-600">Page d’accueil :</span> {plan.highlights.join(' · ')}
        </p>
      )}

      <div className="divide-y divide-gray-100">
        {plan.items.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">Aucun élément : ce plan n’est pas proposé.</p>}
        {plan.items.map((item, index) => (
          <ItemRow key={item.key} item={item} planId={plan.id} first={index === 0} last={index === plan.items.length - 1} plans={plans} />
        ))}
      </div>

      <div className="border-t border-gray-100 px-5 py-3">
        {adding ? (
          <ItemForm planId={plan.id} onDone={() => setAdding(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-600 hover:text-accent-700"
          >
            <Plus className="h-4 w-4" />
            Ajouter un élément
          </button>
        )}
      </div>
      {confirmDialog}
    </Card>
  )
}

function PlanForm({ plan, onDone }: { plan?: EditorPlan; onDone: () => void }) {
  const [state, action, pending] = useActionState(savePlan, undefined)
  useEffect(() => {
    if (state?.success) onDone()
  }, [state, onDone])
  const v = state?.values
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={plan?.id ?? ''} />
      <div>
        <label className={labelClass} htmlFor={`plan-name-${plan?.id ?? 'new'}`}>
          Nom du plan
        </label>
        <input
          id={`plan-name-${plan?.id ?? 'new'}`}
          name="name"
          defaultValue={v?.name ?? plan?.name ?? ''}
          className={inputClass}
          required
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`plan-color-${plan?.id ?? 'new'}`}>
          Couleur (page d’accueil)
        </label>
        <select
          id={`plan-color-${plan?.id ?? 'new'}`}
          name="color"
          defaultValue={v?.color ?? colorFamily(plan?.color ?? 'emerald')}
          className={inputClass}
        >
          {PLAN_COLOR_CHOICES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor={`plan-highlights-${plan?.id ?? 'new'}`}>
          Points forts affichés sur la page d’accueil{' '}
          <span className="font-normal text-gray-400">(un par ligne ; vide = noms des éléments)</span>
        </label>
        <textarea
          id={`plan-highlights-${plan?.id ?? 'new'}`}
          name="highlights"
          rows={4}
          defaultValue={v?.highlights ?? plan?.highlights.join('\n') ?? ''}
          className={inputClass}
        />
      </div>
      <div className="flex flex-wrap items-center gap-5 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="active" defaultChecked={v ? v.active === 'on' : (plan?.active ?? true)} />
          Affiché (page d’accueil et application)
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="comingSoon" defaultChecked={v ? v.comingSoon === 'on' : (plan?.comingSoon ?? false)} />
          Bientôt disponible (visible mais pas encore en vente)
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={pending} className={buttonPrimary}>
          {pending ? 'Enregistrement…' : plan ? 'Enregistrer le plan' : 'Créer le plan'}
        </button>
        <button type="button" onClick={onDone} className={buttonSecondary}>
          Annuler
        </button>
        <FormMessage state={state?.error ? state : undefined} />
      </div>
    </form>
  )
}

function ItemRow({
  item,
  planId,
  first,
  last,
  plans
}: {
  item: EditorItem
  planId: string
  first: boolean
  last: boolean
  plans: EditorPlan[]
}) {
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<FormState>(undefined)
  const [confirmDialog, confirm] = useConfirm()

  if (editing) {
    return (
      <div className="bg-gray-50/60 px-5 py-4">
        <ItemForm item={item} planId={planId} onDone={() => setEditing(false)} />
      </div>
    )
  }

  return (
    <div className="px-5 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1">
          <p className="text-sm font-medium text-gray-900">
            {item.label} {item.mandatory && <Badge tone="info">Obligatoire</Badge>}{' '}
            {!item.active && <Badge tone="warning">Désactivé</Badge>}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            {item.modules.map((m) => MODULE_LABEL[m] ?? m).join(', ')}
            <span className="text-gray-300"> · </span>
            {item.key}
          </p>
          {(item.current > 0 || item.purchases > 0) && (
            <p className="mt-0.5 text-xs text-gray-500">
              {item.current} établissement{item.current > 1 ? 's' : ''} en cours · {item.purchases} achat{item.purchases > 1 ? 's' : ''}
            </p>
          )}
          {item.subscribed && item.purchases === 0 && (
            <p className="mt-0.5 text-xs text-gray-500">Déjà dans un abonnement : désactivez-le ou déplacez-le, il ne peut plus être supprimé.</p>
          )}
        </div>
        <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-gray-900">
          {formatFcfa(item.price)} <span className="text-xs font-normal text-gray-500">/ mois</span>
        </p>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title="Monter"
            aria-label="Monter l’élément"
            disabled={first || pending}
            onClick={() => startTransition(() => moveItem(item.key, 'up'))}
            className={iconButton}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Descendre"
            aria-label="Descendre l’élément"
            disabled={last || pending}
            onClick={() => startTransition(() => moveItem(item.key, 'down'))}
            className={iconButton}
          >
            <ArrowDown className="h-4 w-4" />
          </button>
          <button type="button" title="Modifier" aria-label="Modifier l’élément" onClick={() => setEditing(true)} className={iconButton}>
            <Pencil className="h-4 w-4" />
          </button>
          {item.purchases === 0 && !item.subscribed && (
            <button
              type="button"
              title="Supprimer"
              aria-label="Supprimer l’élément"
              disabled={pending}
              onClick={async () => {
                const ok = await confirm({
                  title: 'Supprimer l’élément',
                  message: (
                    <>
                      « {item.label} » sera retiré de la grille. Avant de supprimer, le site vérifie qu’aucun établissement n’a jamais
                      eu une de ses pages dans son abonnement ; sinon, la suppression est refusée.
                    </>
                  ),
                  confirmLabel: 'Supprimer',
                  danger: true
                })
                if (ok) startTransition(async () => setMessage(await safeCall(() => deleteItem(item.key))))
              }}
              className={`${iconButton} hover:bg-red-50 hover:text-red-600`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        {plans.length > 1 && (
          <select
            aria-label="Déplacer vers un autre plan"
            value=""
            disabled={pending}
            onChange={(e) => {
              const target = e.target.value
              if (target) startTransition(async () => setMessage(await safeCall(() => moveItemToPlan(item.key, target))))
            }}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600"
          >
            <option value="">Déplacer vers…</option>
            {plans
              .filter((p) => p.id !== planId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        )}
      </div>
      {message?.error && <p className="mt-1 text-xs text-red-600">{message.error}</p>}
      {confirmDialog}
    </div>
  )
}

function ItemForm({ item, planId, onDone }: { item?: EditorItem; planId: string; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveItem, undefined)
  const [modules, setModules] = useState<string[]>(state?.values?.modules ? state.values.modules.split(',') : (item?.modules ?? []))
  const [active, setActive] = useState(item?.active ?? true)
  useEffect(() => {
    if (state?.success) onDone()
  }, [state, onDone])
  const v = state?.values
  const id = item?.key ?? `new-${planId}`
  const modulesChanged = item && [...modules].sort().join() !== [...item.modules].sort().join()
  const deactivating = item && item.active && !active

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="key" value={item?.key ?? ''} />
      <input type="hidden" name="planId" value={planId} />
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <div>
          <label className={labelClass} htmlFor={`item-label-${id}`}>
            Nom de l’élément
          </label>
          <input id={`item-label-${id}`} name="label" defaultValue={v?.label ?? item?.label ?? ''} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass} htmlFor={`item-price-${id}`}>
            Prix (F / mois)
          </label>
          <input
            id={`item-price-${id}`}
            name="price"
            inputMode="numeric"
            defaultValue={v?.price ?? item?.price ?? 10000}
            className={`${inputClass} text-right`}
          />
        </div>
      </div>
      <fieldset>
        <legend className={labelClass}>Modules de l’application débloqués</legend>
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {SELLABLE_MODULES.map((group) => (
            <div key={group.group}>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{group.group}</p>
              {group.modules.map((m) => (
                <label key={m.id} className="flex items-center gap-2 py-0.5 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="modules"
                    value={m.id}
                    checked={modules.includes(m.id)}
                    onChange={(e) => setModules((prev) => (e.target.checked ? [...prev, m.id] : prev.filter((x) => x !== m.id)))}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-5">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="active" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Actif (proposé à l’achat)
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="mandatory" defaultChecked={v ? v.mandatory === 'on' : (item?.mandatory ?? false)} />
          Obligatoire (toujours inclus dans un abonnement)
        </label>
      </div>
      {item && item.current > 0 && (modulesChanged || deactivating) && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {item.current} établissement{item.current > 1 ? 's ont' : ' a'} cet élément dans {item.current > 1 ? 'leur' : 'son'} abonnement en
          cours : ce qui est payé reste acquis, le changement s’appliquera à{' '}
          {item.current > 1 ? 'leurs prochains paiements' : 'son prochain paiement'}.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonPrimary}>
          {pending ? 'Enregistrement…' : item ? 'Enregistrer' : 'Ajouter'}
        </button>
        <button type="button" onClick={onDone} className={buttonSecondary}>
          Annuler
        </button>
        <FormMessage state={state?.error ? state : undefined} />
      </div>
    </form>
  )
}
