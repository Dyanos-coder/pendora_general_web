// Grille tarifaire (tarif.png, Plan-Site-Pandora.md §6.2) — source unique :
// - affichage sur la page d'accueil (`items` = libellés commerciaux) ;
// - valeurs initiales de la table PriceItem (`billing` = éléments facturables et modules de
//   l'application qu'ils débloquent). Les prix se modifient ensuite dans la console (page Tarifs).

export interface Offer {
  id: string
  name: string
  items: string[]
  price: number
  /** « forfait » : un prix pour tout le groupe ; « module » : prix par module choisi. */
  unit: 'forfait' | 'module'
  color: 'emerald' | 'sky' | 'orange' | 'violet' | 'teal' | 'pink' | 'indigo' | 'green'
  comingSoon?: boolean
  mandatory?: boolean
  /** Éléments facturables : un seul pour un forfait, un par module sinon. */
  billing: { key: string; label: string; modules: string[] }[]
}

export const OFFERS: Offer[] = [
  {
    id: 'soins',
    name: 'Soins & Patients + Consultations',
    items: ['Patients', 'Consultations'],
    price: 10000,
    unit: 'forfait',
    color: 'emerald',
    mandatory: true,
    billing: [{ key: 'soins', label: 'Soins & Patients + Consultations', modules: ['patients', 'consultations'] }]
  },
  {
    id: 'administration',
    name: 'Gestion administrative',
    items: ['Ressources humaines', 'Approvisionnement'],
    price: 10000,
    unit: 'module',
    color: 'sky',
    billing: [
      { key: 'hr', label: 'Ressources humaines', modules: ['hr'] },
      { key: 'procurement', label: 'Approvisionnement', modules: ['procurement'] }
    ]
  },
  {
    id: 'services',
    name: 'Gestion des patients et services',
    items: ['Rendez-vous', 'Hospitalisation', 'Urgences'],
    price: 10000,
    unit: 'module',
    color: 'orange',
    billing: [
      { key: 'appointments', label: 'Rendez-vous', modules: ['appointments'] },
      { key: 'hospitalization', label: 'Hospitalisation', modules: ['hospitalization'] },
      { key: 'emergencies', label: 'Urgences', modules: ['emergencies'] }
    ]
  },
  {
    id: 'examens',
    name: 'Examens & plateau technique',
    items: ['Laboratoire', 'Imagerie médicale', 'Cardiologie', 'Anatomopathologie', 'Endoscopie', 'Bloc opératoire'],
    price: 10000,
    unit: 'module',
    color: 'violet',
    billing: [
      { key: 'laboratory', label: 'Laboratoire', modules: ['laboratory'] },
      { key: 'imaging', label: 'Imagerie médicale', modules: ['imaging'] },
      { key: 'cardiology', label: 'Cardiologie', modules: ['cardiology'] },
      { key: 'pathology', label: 'Anatomopathologie', modules: ['pathology'] },
      { key: 'endoscopy', label: 'Endoscopie', modules: ['endoscopy'] },
      { key: 'operating-room', label: 'Bloc opératoire', modules: ['operating-room'] }
    ]
  },
  {
    id: 'medicaments',
    name: 'Médicaments & stocks',
    items: ['Pharmacie', 'Stocks & Dépôts', 'Banque de sang'],
    price: 10000,
    unit: 'module',
    color: 'teal',
    billing: [
      { key: 'pharmacy', label: 'Pharmacie', modules: ['pharmacy'] },
      { key: 'stocks', label: 'Stocks & Dépôts', modules: ['stocks'] },
      { key: 'blood-bank', label: 'Banque de sang', modules: ['blood-bank'] }
    ]
  },
  {
    id: 'intelligence',
    name: 'Intelligence & pilotage',
    items: ['Intelligence artificielle', 'Analyse & pilotage', 'Statistiques', 'Prévisions'],
    price: 10000,
    unit: 'module',
    color: 'pink',
    comingSoon: true,
    billing: [
      { key: 'ai-predictions', label: 'IA & Prédictions', modules: ['ai-predictions'] },
      { key: 'analytics', label: 'Rapports & Analyse', modules: ['analytics'] },
      { key: 'automation-studio', label: 'Automation Studio', modules: ['automation-studio'] }
    ]
  },
  {
    id: 'signature',
    name: 'Signature à distance',
    items: ['Documents & contrats', 'Signature électronique', 'Suivi des documents'],
    price: 10000,
    unit: 'forfait',
    color: 'indigo',
    billing: [{ key: 'signature', label: 'Signature à distance', modules: ['documents'] }]
  },
  {
    id: 'finance',
    name: 'Gestion financière',
    items: ['Comptabilité', 'Caisse'],
    price: 20000,
    unit: 'forfait',
    color: 'green',
    billing: [{ key: 'finance', label: 'Gestion financière', modules: ['finance', 'cashier'] }]
  }
]

/** Modules toujours inclus, sans supplément (§9-A) : tableau de bord, paramètres et Gouvernance & qualité. */
export const FREE_MODULES = ['dashboard', 'settings', 'quality', 'risk-management', 'audit-compliance']
