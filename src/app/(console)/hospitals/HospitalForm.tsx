'use client'

import { useActionState, useRef, useState, useTransition } from 'react'
import { createHospital, testHospitalAccess, updateHospital } from '@/app/actions/hospitals'
import type { FormState } from '@/app/actions/form-state'
import { FormMessage, buttonPrimary, buttonSecondary, inputClass, labelClass } from '@/components/ui'

interface HospitalFormProps {
  /** Présent en modification ; absent pour un nouvel hôpital. */
  hospital?: {
    id: string
    name: string
    dbHost: string
    dbPort: number
    dbName: string
    dbUser: string
    dbSsl: boolean
    notes: string | null
  }
}

/** Ajout / modification d'un hôpital (admin) : accès à sa base, testés avant enregistrement. */
export function HospitalForm({ hospital }: HospitalFormProps) {
  const [saveState, saveAction, saving] = useActionState(hospital ? updateHospital : createHospital, undefined)
  const [testState, setTestState] = useState<FormState>(undefined)
  const [testing, startTest] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  // Valeurs à réafficher : celles saisies avant une erreur, sinon celles de l'hôpital.
  const v = saveState?.values
  const value = (key: string, fallback: string | number | undefined | null): string => v?.[key] ?? String(fallback ?? '')

  // « Tester la connexion » n'envoie pas le formulaire (il resterait vidé par React) : on lit
  // ses champs et on appelle l'action directement.
  function handleTest(): void {
    if (!formRef.current) return
    const formData = new FormData(formRef.current)
    startTest(async () => setTestState(await testHospitalAccess(undefined, formData)))
  }

  return (
    <form ref={formRef} action={saveAction} onSubmit={() => setTestState(undefined)} className="space-y-4">
      {hospital && <input type="hidden" name="hospitalId" value={hospital.id} />}
      <div>
        <label className={labelClass}>Nom de l&apos;hôpital</label>
        <input name="name" defaultValue={value('name', hospital?.name)} required className={inputClass} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className={labelClass}>Hôte de la base</label>
          <input name="dbHost" defaultValue={value('dbHost', hospital?.dbHost)} placeholder="srv123.hstgr.io" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Port</label>
          <input name="dbPort" type="number" defaultValue={value('dbPort', hospital?.dbPort ?? 3306)} className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Nom de la base</label>
          <input name="dbName" defaultValue={value('dbName', hospital?.dbName)} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Utilisateur de la base {!hospital && '(= identifiant de l’hôpital)'}</label>
          <input name="dbUser" defaultValue={value('dbUser', hospital?.dbUser)} required autoComplete="off" className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Mot de passe de la base</label>
        <input
          name="dbPassword"
          type="password"
          autoComplete="new-password"
          placeholder={hospital ? 'Laisser vide pour conserver le mot de passe actuel' : ''}
          className={inputClass}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" name="dbSsl" defaultChecked={v ? v.dbSsl === 'on' : hospital?.dbSsl} />
        Connexion chiffrée (SSL)
      </label>
      {!hospital && (
        <div>
          <label className={labelClass}>Version mobile</label>
          <select name="mobileStatus" defaultValue={value('mobileStatus', 'NON_SOUHAITEE')} className={inputClass}>
            <option value="NON_SOUHAITEE">Non souhaitée</option>
            <option value="SOUHAITEE">Souhaitée (à installer)</option>
            <option value="INSTALLEE">Installée</option>
          </select>
        </div>
      )}
      <div>
        <label className={labelClass}>Notes</label>
        <textarea name="notes" defaultValue={value('notes', hospital?.notes)} rows={2} className={inputClass} />
      </div>
      <FormMessage state={testState ?? saveState} />
      <div className="flex gap-2">
        <button type="button" onClick={handleTest} disabled={testing || saving} className={buttonSecondary}>
          {testing ? 'Test en cours…' : 'Tester la connexion'}
        </button>
        <button type="submit" disabled={saving || testing} className={buttonPrimary}>
          {saving ? 'Enregistrement…' : hospital ? 'Enregistrer les modifications' : 'Ajouter l’hôpital'}
        </button>
      </div>
    </form>
  )
}
