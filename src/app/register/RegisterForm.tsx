'use client'

import { useActionState } from 'react'
import { register } from '@/app/actions/auth'
import { FormMessage, buttonPrimary, inputClass, labelClass } from '@/components/ui'

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, undefined)
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="name" className={labelClass}>
          Nom complet
        </label>
        <input id="name" name="name" autoFocus defaultValue={state?.values?.name} className={inputClass} />
      </div>
      <div>
        <label htmlFor="email" className={labelClass}>
          E-mail
        </label>
        <input id="email" name="email" type="email" autoComplete="username" defaultValue={state?.values?.email} className={inputClass} />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>
          Mot de passe (8 caractères min.)
        </label>
        <input id="password" name="password" type="password" autoComplete="new-password" className={inputClass} />
      </div>
      <div>
        <label htmlFor="confirm" className={labelClass}>
          Confirmer le mot de passe
        </label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" className={inputClass} />
      </div>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={`${buttonPrimary} w-full py-2.5`}>
        {pending ? 'Création…' : 'Créer mon compte'}
      </button>
    </form>
  )
}
