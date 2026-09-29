import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Banknote,
  BrainCircuit,
  Check,
  CloudOff,
  FileSignature,
  FlaskConical,
  HeartPulse,
  Lock,
  MonitorSmartphone,
  Pill,
  RefreshCw,
  Smartphone,
  Stethoscope,
  Users,
  Wallet
} from 'lucide-react'
import { getCurrentAccount } from '@/lib/auth'
import { OFFERS, type Offer } from '@/lib/offers'
import { ContactForm } from './ContactForm'

export const metadata = {
  title: 'Pandora Health — Logiciel de gestion hospitalière',
  description:
    'Dossier patient, examens, pharmacie, caisse, comptabilité : tout votre établissement de santé dans un seul logiciel, qui fonctionne même sans Internet.'
}

const FEATURES = [
  {
    icon: Stethoscope,
    title: 'Soins & patients',
    text: 'Dossier patient complet, consultations, rendez-vous, hospitalisation, urgences et bloc opératoire.'
  },
  {
    icon: FlaskConical,
    title: 'Examens & plateau technique',
    text: 'Laboratoire, imagerie, cardiologie, anatomopathologie, endoscopie — résultats joints au dossier.'
  },
  {
    icon: Pill,
    title: 'Médicaments & stocks',
    text: 'Pharmacie, dépôts, mouvements, inventaires, péremptions et banque de sang.'
  },
  {
    icon: Wallet,
    title: 'Caisse & comptabilité',
    text: 'Encaissement en trois clics, reçu avec numéro de passage, et remontée automatique en comptabilité.'
  },
  {
    icon: FileSignature,
    title: 'Signature électronique',
    text: 'Documents et contrats signés à distance par la direction, avec suivi des demandes.'
  },
  {
    icon: BrainCircuit,
    title: 'Pilotage & intelligence',
    text: 'Tableaux de bord, rapports, automatisations et assistant IA pour la direction.',
    soon: true
  }
]

const STRENGTHS = [
  { icon: CloudOff, title: 'Fonctionne sans Internet', text: 'Le travail continue pendant une coupure, puis se synchronise tout seul.' },
  { icon: Lock, title: 'Données protégées', text: 'Rôles et droits par métier, données locales chiffrées, traçabilité des actions.' },
  { icon: RefreshCw, title: 'Toujours à jour', text: 'Les nouvelles versions s’installent automatiquement sur chaque poste.' },
  { icon: Smartphone, title: 'Paiement Mobile Money', text: 'Abonnement réglé en quelques secondes, sans déplacement.' }
]

const STEPS = [
  { title: 'Démonstration', text: 'Nous vous présentons le logiciel et identifions ensemble les modules utiles à votre établissement.' },
  { title: 'Installation', text: 'Nous installons l’application sur vos postes et configurons votre établissement. Le premier mois est inclus.' },
  { title: 'Abonnement', text: 'Vous ne payez que les modules choisis, de 1 à 24 mois, directement depuis le logiciel par Mobile Money.' }
]

const OFFER_STYLE: Record<Offer['color'], { bar: string; chip: string; price: string }> = {
  emerald: { bar: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700', price: 'text-emerald-700' },
  sky: { bar: 'bg-sky-500', chip: 'bg-sky-50 text-sky-700', price: 'text-sky-700' },
  orange: { bar: 'bg-orange-500', chip: 'bg-orange-50 text-orange-700', price: 'text-orange-700' },
  violet: { bar: 'bg-violet-500', chip: 'bg-violet-50 text-violet-700', price: 'text-violet-700' },
  teal: { bar: 'bg-teal-500', chip: 'bg-teal-50 text-teal-700', price: 'text-teal-700' },
  pink: { bar: 'bg-pink-500', chip: 'bg-pink-50 text-pink-700', price: 'text-pink-700' },
  indigo: { bar: 'bg-indigo-500', chip: 'bg-indigo-50 text-indigo-700', price: 'text-indigo-700' },
  green: { bar: 'bg-green-600', chip: 'bg-green-50 text-green-700', price: 'text-green-700' }
}

function price(amount: number): string {
  return amount.toLocaleString('fr-FR')
}

export default async function LandingPage() {
  const account = await getCurrentAccount()

  return (
    <div className="bg-white text-gray-900">
      {/* En-tête */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="" width={36} height={36} className="rounded-xl" priority />
            <span className="leading-tight">
              <span className="block text-sm font-bold tracking-tight">PANDORA</span>
              <span className="block text-xs font-semibold tracking-wide text-accent-600">HEALTH</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-gray-600 md:flex">
            <a href="#fonctionnalites" className="hover:text-gray-900">
              Fonctionnalités
            </a>
            <a href="#fonctionnement" className="hover:text-gray-900">
              Fonctionnement
            </a>
            <a href="#tarifs" className="hover:text-gray-900">
              Tarifs
            </a>
            <a href="#contact" className="hover:text-gray-900">
              Contact
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href={account ? '/dashboard' : '/login'}
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 sm:inline-flex"
            >
              {account ? 'Console' : 'Espace équipe'}
            </Link>
            <a
              href="#contact"
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-700"
            >
              Demander une démo
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0b0a14] text-white">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-accent-600/30 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-[100px]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-accent-200">
              <HeartPulse className="h-3.5 w-3.5" />
              Logiciel de gestion hospitalière
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
              Tout votre établissement de santé, <span className="text-accent-400">dans un seul logiciel.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-300">
              Dossier patient, examens, pharmacie, caisse et comptabilité réunis — un outil simple pour vos équipes, qui continue
              de fonctionner même quand Internet coupe.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#contact"
                className="inline-flex items-center gap-2 rounded-lg bg-accent-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-600/30 transition hover:bg-accent-400"
              >
                Demander une démonstration
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#tarifs"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Voir les tarifs
              </a>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-300">
              {['Premier mois inclus', 'Sans engagement de durée', 'Paiement Mobile Money'].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Aperçu stylisé de l'application */}
          <div className="relative" aria-hidden="true">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-2 shadow-2xl shadow-black/40 backdrop-blur">
              <div className="overflow-hidden rounded-xl bg-gray-50">
                <div className="flex items-center gap-1.5 border-b border-gray-200 bg-white px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="ml-3 text-[11px] font-medium text-gray-400">Pandora Health — Tableau de bord</span>
                </div>
                <div className="flex">
                  <div className="hidden w-32 shrink-0 space-y-1.5 border-r border-gray-200 bg-white p-3 sm:block">
                    {['Patients', 'Consultations', 'Laboratoire', 'Pharmacie', 'Caisse', 'Comptabilité'].map((item, i) => (
                      <div
                        key={item}
                        className={`rounded-md px-2 py-1.5 text-[10px] font-medium ${i === 4 ? 'bg-accent-50 text-accent-700' : 'text-gray-500'}`}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 space-y-3 p-4">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Patients du jour', value: '48', color: 'text-gray-900' },
                        { label: 'Encaissé', value: '385 000 F', color: 'text-emerald-600' },
                        { label: 'Lits occupés', value: '72 %', color: 'text-accent-600' }
                      ].map((k) => (
                        <div key={k.label} className="rounded-lg border border-gray-100 bg-white p-2.5">
                          <p className="text-[9px] text-gray-400">{k.label}</p>
                          <p className={`text-sm font-bold ${k.color}`}>{k.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-lg border border-gray-100 bg-white p-3">
                      <p className="mb-2 text-[10px] font-semibold text-gray-700">Encaissements de la semaine</p>
                      <div className="flex h-20 items-end gap-1.5">
                        {[40, 65, 52, 80, 60, 92, 74].map((h, i) => (
                          <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-accent-600 to-accent-400" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5 rounded-lg border border-gray-100 bg-white p-3">
                      {[
                        ['Consultation générale', 'Payé'],
                        ['Laboratoire — NFS', 'Payé'],
                        ['Pharmacie', 'En attente']
                      ].map(([label, status]) => (
                        <div key={label} className="flex items-center justify-between text-[10px]">
                          <span className="text-gray-600">{label}</span>
                          <span
                            className={`rounded-full px-1.5 py-0.5 font-semibold ${status === 'Payé' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
                          >
                            {status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-5 hidden items-center gap-2 rounded-xl border border-white/10 bg-[#16132a] px-4 py-3 text-sm shadow-xl sm:flex">
              <CloudOff className="h-4 w-4 text-emerald-400" />
              <span className="text-gray-200">Hors connexion : le travail continue</span>
            </div>
          </div>
        </div>
      </section>

      {/* Points forts */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {STRENGTHS.map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50">
                <Icon className="h-5 w-5 text-accent-600" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-gray-900">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fonctionnalités */}
      <section id="fonctionnalites" className="scroll-mt-20 bg-gray-50">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-accent-600">Fonctionnalités</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Un module pour chaque service de l’établissement</h2>
            <p className="mt-4 text-gray-600">
              Activez uniquement ce dont vous avez besoin. Chaque module partage le même dossier patient : l’information circule
              entre l’accueil, les soins, les examens et la caisse, sans double saisie.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text, soon }) => (
              <div key={title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  {soon && <span className="rounded-full bg-pink-50 px-2.5 py-0.5 text-xs font-semibold text-pink-700">Bientôt</span>}
                </div>
                <h3 className="mt-5 text-base font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hors connexion et postes */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-accent-600">Pensé pour le terrain</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Une coupure d’Internet n’arrête plus vos services</h2>
            <p className="mt-4 text-gray-600">
              Chaque poste garde une copie sécurisée des données dont il a besoin. Pendant une coupure, les équipes continuent
              d’enregistrer patients, consultations et examens ; tout se synchronise automatiquement au retour du réseau.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-gray-700">
              {[
                'Application installée sur vos postes Windows, une seule base partagée pour tout l’établissement',
                'Rôles par métier : médecin, infirmier, technicien, pharmacien, caissier, administration, direction',
                'Journal des actions : qui a fait quoi, et quand',
                'Version mobile disponible sur demande'
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: MonitorSmartphone, title: 'Multi-postes', text: 'Accueil, caisse, laboratoire, direction : chacun son poste, les mêmes données.' },
              { icon: Users, title: 'Accès par rôle', text: 'Chacun ne voit que les modules de son métier.' },
              { icon: Banknote, title: 'Caisse intégrée', text: 'Reçus imprimés, clôture de caisse avec calcul de l’écart.' },
              { icon: RefreshCw, title: 'Synchronisation', text: 'Reprise automatique dès que la connexion revient.' }
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <Icon className="h-5 w-5 text-accent-600" />
                <p className="mt-3 text-sm font-semibold text-gray-900">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fonctionnement */}
      <section id="fonctionnement" className="scroll-mt-20 bg-[#0b0a14] text-white">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-accent-400">Fonctionnement</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Opérationnel en trois étapes</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-500 text-sm font-bold">{i + 1}</span>
                <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-300">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tarifs */}
      <section id="tarifs" className="scroll-mt-20 bg-gray-50">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-accent-600">Tarifs</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Activez uniquement ce dont vous avez besoin</h2>
            <p className="mt-4 text-gray-600">
              Abonnement mensuel, calculé selon les modules choisis. Premier mois inclus à l’installation, puis renouvellement
              le 28 du mois, pour 1 à 24 mois à la fois.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {OFFERS.map((offer) => {
              const style = OFFER_STYLE[offer.color]
              return (
                <div key={offer.id} className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <div className={`h-1.5 ${style.bar}`} />
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold leading-snug text-gray-900">{offer.name}</h3>
                      {offer.comingSoon && <span className="shrink-0 rounded-full bg-pink-50 px-2 py-0.5 text-[10px] font-semibold text-pink-700">Bientôt</span>}
                    </div>
                    <ul className="mt-4 flex-1 space-y-1.5">
                      {offer.items.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                          <Check className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5 border-t border-gray-100 pt-4">
                      <p className={`text-2xl font-bold ${style.price}`}>
                        {price(offer.price)} <span className="text-sm font-semibold">F</span>
                      </p>
                      <p className="text-xs text-gray-500">{offer.unit === 'forfait' ? 'par mois' : 'par mois et par module'}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-8 text-center text-sm text-gray-500">
            Exemple : Soins & Patients + Laboratoire + Pharmacie + Gestion financière = <strong className="text-gray-800">50 000 F / mois</strong>.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-20 bg-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <p className="text-sm font-semibold text-accent-600">Contact</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Voyons ensemble ce qui convient à votre établissement</h2>
            <p className="mt-4 text-gray-600">
              Laissez-nous vos coordonnées : un membre de l’équipe Pandora vous rappelle pour organiser une démonstration.
            </p>
            <ol className="mt-8 space-y-4">
              {['Nous vous rappelons', 'Démonstration sur place ou à distance', 'Installation et prise en main'].map((item, i) => (
                <li key={item} className="flex items-center gap-3 text-sm text-gray-700">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-50 text-xs font-bold text-accent-700">{i + 1}</span>
                  {item}
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 sm:p-8 lg:col-span-3">
            <ContactForm />
          </div>
        </div>
      </section>

      {/* Pied de page */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-gray-500">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="" width={28} height={28} className="rounded-lg" />
            <span>© {new Date().getFullYear()} Pandora Health</span>
          </div>
          <div className="flex gap-6">
            <a href="#tarifs" className="hover:text-gray-900">
              Tarifs
            </a>
            <a href="#contact" className="hover:text-gray-900">
              Contact
            </a>
            <Link href="/login" className="hover:text-gray-900">
              Espace équipe
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
