import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'

// Écrans de marque de la console (connexion, inscription) : les mêmes que ceux de l'application
// Pandora Health — fond encre avec halo vert, logo dans son orbite dorée, pouls ECG qui défile.

const ECG_PATH =
  'M0 35 H120 L132 35 L140 22 L148 35 H170 L180 35 L188 6 L198 62 L206 35 H240 L252 28 L262 35 ' +
  'H520 L532 35 L540 22 L548 35 H570 L580 35 L588 6 L598 62 L606 35 H640 L652 28 L662 35 ' +
  'H920 L932 35 L940 22 L948 35 H970 L980 35 L988 6 L998 62 L1006 35 H1040 L1052 28 L1062 35 H1200'

export function OrbitLogo({ size = 128 }: { size?: number }) {
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <Image
        src="/logo.png"
        alt="Pandora Health"
        width={Math.round(size * 0.76)}
        height={Math.round(size * 0.76)}
        priority
        className="rounded-[24px] shadow-[0_0_60px_rgba(52,204,107,0.35)]"
      />
      <span className="animate-orbit absolute -inset-1.5 rounded-full border-[1.5px] border-transparent border-t-gold-500 border-r-gold-500/35">
        <span className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-[#34cc6b] shadow-[0_0_12px_#34cc6b]" />
      </span>
    </div>
  )
}

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 bg-[radial-gradient(800px_440px_at_50%_30%,#0d2a19_0%,#060c09_65%)] px-4 py-10 text-[#d3e0d8]">
      <svg className="pointer-events-none absolute inset-x-0 bottom-6 h-[70px] w-full opacity-55" viewBox="0 0 1200 70" preserveAspectRatio="none" aria-hidden="true">
        <path
          className="animate-ecg"
          d={ECG_PATH}
          fill="none"
          stroke="#34cc6b"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 0 4px #34cc6b)' }}
        />
      </svg>
      <div className="relative z-10 w-full max-w-sm">
        <Link href="/" className="mb-6 flex flex-col items-center gap-3">
          <OrbitLogo size={104} />
          <span className="font-display text-xl font-extrabold text-white">
            Pandora <span className="text-gold-400">Console</span>
          </span>
        </Link>
        <div className="rounded-[20px] border border-white/[0.08] bg-[rgba(13,24,18,0.72)] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <h1 className="text-xl font-bold text-white">{title}</h1>
          <p className="mt-1 mb-6 text-[13px] text-[#8fa398]">{subtitle}</p>
          {children}
        </div>
        {footer && <div className="mt-6 text-center text-sm text-[#8fa398]">{footer}</div>}
      </div>
    </main>
  )
}

/** Champs et bouton des écrans de marque (fond toujours sombre). */
export const authInputClass =
  'w-full rounded-[10px] border border-[#1b2b22] bg-[#08120d] px-3 py-2.5 text-sm text-white placeholder:text-[#5d6f65] focus:border-[#34cc6b] focus:outline-none focus:ring-4 focus:ring-[#34cc6b]/15'
export const authLabelClass = 'mb-1.5 block text-xs font-medium text-[#d3e0d8]'
export const authButtonClass =
  'flex w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-b from-[#45d97a] to-[#22b85a] px-4 py-3 text-sm font-semibold text-[#03140a] shadow-[0_8px_24px_rgba(52,204,107,0.25)] transition-shadow hover:shadow-[0_8px_30px_rgba(52,204,107,0.45)] disabled:cursor-not-allowed disabled:opacity-60'
