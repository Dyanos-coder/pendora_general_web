'use client'

import { useActionState } from 'react'
import { login } from '@/app/actions/auth'
import { authButtonClass, authInputClass, authLabelClass } from '@/components/AuthShell'

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined)
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className={authLabelClass}>
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          defaultValue={state?.values?.email}
          className={authInputClass}
        />
      </div>
      <div>
        <label htmlFor="password" className={authLabelClass}>
          Mot de passe
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" className={authInputClass} />
      </div>
      {state?.error && (
        <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-[#fca5a5]">{state.error}</p>
      )}
      <button type="submit" disabled={pending} className={authButtonClass}>
        {pending ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  )
}
