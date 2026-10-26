'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { TriangleAlert } from 'lucide-react'
import { buttonSecondary } from '@/components/ui'

// Fenêtre de confirmation de la console, à la place de la boîte du navigateur (window.confirm) :
// `const [confirmDialog, confirm] = useConfirm()` puis `if (await confirm({ ... })) …`, et
// `{confirmDialog}` dans le rendu.

export interface ConfirmOptions {
  title: string
  message: ReactNode
  /** Texte du bouton de validation (par défaut « Confirmer »). */
  confirmLabel?: string
  /** Action destructrice : bouton rouge. */
  danger?: boolean
}

const dangerButton =
  'inline-flex items-center justify-center gap-2 rounded-[10px] bg-red-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700'
const confirmButton =
  'inline-flex items-center justify-center gap-2 rounded-[10px] bg-gradient-to-b from-accent-500 to-accent-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-accent-600 hover:to-accent-700'

export function useConfirm(): [ReactNode, (options: ConfirmOptions) => Promise<boolean>] {
  const [request, setRequest] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null)
  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setRequest({ ...options, resolve })), [])
  const close = useCallback(
    (ok: boolean) => {
      request?.resolve(ok)
      setRequest(null)
    },
    [request]
  )
  const dialog = request ? <ConfirmDialog {...request} onClose={close} /> : null
  return [dialog, confirm]
}

function ConfirmDialog({ title, message, confirmLabel = 'Confirmer', danger, onClose }: ConfirmOptions & { onClose: (ok: boolean) => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4" onMouseDown={() => onClose(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-start gap-3">
          {danger && (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-50 text-red-600">
              <TriangleAlert className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <div className="mt-1.5 text-sm text-gray-600">{message}</div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => onClose(false)} className={buttonSecondary}>
            Annuler
          </button>
          <button ref={confirmRef} type="button" onClick={() => onClose(true)} className={danger ? dangerButton : confirmButton}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
