'use client'

import { useActionState } from 'react'
import { Send } from 'lucide-react'
import { submitContact } from '@/app/actions/contact'
import { FormMessage, buttonPrimary, inputClass, labelClass } from '@/components/ui'

/** « Demander une démo » — enregistré pour l'équipe Pandora (console › Demandes de contact). */
export function ContactForm() {
  const [state, action, pending] = useActionState(submitContact, undefined)
  const v = state?.values

  if (state?.success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-base font-semibold text-emerald-800">{state.success}</p>
      </div>
    )
  }

  return (
    <form action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Champ piège invisible (anti-robots) */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <div>
        <label htmlFor="c-name" className={labelClass}>
          Votre nom *
        </label>
        <input id="c-name" name="name" required defaultValue={v?.name} className={inputClass} />
      </div>
      <div>
        <label htmlFor="c-establishment" className={labelClass}>
          Établissement *
        </label>
        <input id="c-establishment" name="establishment" required defaultValue={v?.establishment} placeholder="Clinique, hôpital, centre de santé…" className={inputClass} />
      </div>
      <div>
        <label htmlFor="c-phone" className={labelClass}>
          Téléphone *
        </label>
        <input id="c-phone" name="phone" type="tel" required defaultValue={v?.phone} className={inputClass} />
      </div>
      <div>
        <label htmlFor="c-email" className={labelClass}>
          E-mail
        </label>
        <input id="c-email" name="email" type="email" defaultValue={v?.email} className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="c-city" className={labelClass}>
          Ville
        </label>
        <input id="c-city" name="city" defaultValue={v?.city} className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="c-message" className={labelClass}>
          Votre besoin
        </label>
        <textarea
          id="c-message"
          name="message"
          rows={4}
          defaultValue={v?.message}
          placeholder="Nombre de postes, modules qui vous intéressent, date souhaitée pour une démonstration…"
          className={inputClass}
        />
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button type="submit" disabled={pending} className={`${buttonPrimary} px-6 py-3`}>
          <Send className="h-4 w-4" />
          {pending ? 'Envoi…' : 'Demander une démonstration'}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  )
}
