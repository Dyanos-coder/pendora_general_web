/** Retour des actions de formulaire (useActionState) : un message d'erreur ou de succès, et les
 * valeurs saisies (hors mots de passe) — React 19 vide le formulaire après chaque envoi, le
 * formulaire les réaffiche via `defaultValue` pour ne rien faire perdre en cas d'erreur. */
export type FormState = { error?: string; success?: string; values?: Record<string, string> } | undefined
