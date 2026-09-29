'use server'

import { randomUUID } from 'crypto'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAccount } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import type { FormState } from './form-state'

// Formulaire « Demander une démo » de la page d'accueil (public) et suivi des demandes dans la
// console. Anti-spam : champ piège invisible (`website`, rempli seulement par les robots) et
// 5 demandes maximum par adresse IP et par heure.

const recent = new Map<string, number[]>()
const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 5

export async function submitContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const field = (key: string, max = 200) => String(formData.get(key) ?? '').trim().slice(0, max)
  const values = {
    name: field('name'),
    establishment: field('establishment'),
    phone: field('phone', 40),
    email: field('email'),
    city: field('city'),
    message: field('message', 2000)
  }

  // Robot : on fait comme si tout s'était bien passé, sans rien enregistrer.
  if (field('website')) return { success: 'Merci, votre demande a bien été envoyée.' }

  if (!values.name || !values.establishment || !values.phone) {
    return { error: 'Nom, établissement et téléphone sont obligatoires.', values }
  }
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    return { error: 'Adresse e-mail invalide.', values }
  }

  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
  const now = Date.now()
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  if (hits.length >= MAX_PER_WINDOW) {
    return { error: 'Trop de demandes envoyées. Réessayez plus tard.', values }
  }
  recent.set(ip, [...hits, now])

  await prisma.contactRequest.create({
    data: {
      id: randomUUID(),
      name: values.name,
      establishment: values.establishment,
      phone: values.phone,
      email: values.email || null,
      city: values.city || null,
      message: values.message || null
    }
  })
  return { success: 'Merci ! Votre demande a bien été envoyée : notre équipe vous rappelle très vite.' }
}

/** Marque une demande comme traitée (ou la rouvre) — admins et prospecteurs. */
export async function setContactHandled(id: string, handled: boolean): Promise<void> {
  const account = await requireAccount()
  await prisma.contactRequest.update({
    where: { id },
    data: handled
      ? { status: 'TRAITEE', handledById: account.id, handledAt: new Date() }
      : { status: 'NOUVELLE', handledById: null, handledAt: null }
  })
  await logAudit(account.id, handled ? 'contact.handled' : 'contact.reopened', id)
  revalidatePath('/leads')
}
