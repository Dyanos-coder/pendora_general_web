'use client'

import { useActionState } from 'react'
import { login } from '@/app/actions/auth'
import { FormMessage, buttonPrimary, inputClass, labelClass } from '@/components/ui'

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined)
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className={labelClass}>
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          defaultValue={state?.values?.email}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>
          Mot de passe
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" className={inputClass} />
      </div>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={`${buttonPrimary} w-full py-2.5`}>
        {pending ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  )
}
