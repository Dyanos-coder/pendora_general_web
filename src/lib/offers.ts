// Grille tarifaire publique (tarif.png, Plan-Site-Pandora.md §6.2). Affichée sur la page
// d'accueil ; servira de valeurs initiales à la table ModulePrice (étape 4 : abonnements).

export interface Offer {
  id: string
  name: string
  items: string[]
  price: number
  /** « forfait » : un prix pour tout le groupe ; « module » : prix par module choisi. */
  unit: 'forfait' | 'module'
  color: 'emerald' | 'sky' | 'orange' | 'violet' | 'teal' | 'pink' | 'indigo' | 'green'
  comingSoon?: boolean
}

export const OFFERS: Offer[] = [
  { id: 'soins', name: 'Soins & Patients + Consultations', items: ['Patients', 'Consultations'], price: 10000, unit: 'forfait', color: 'emerald' },
  { id: 'administration', name: 'Gestion administrative', items: ['Ressources humaines', 'Approvisionnement'], price: 10000, unit: 'module', color: 'sky' },
  {
    id: 'services',
    name: 'Gestion des patients et services',
    items: ['Rendez-vous', 'Hospitalisation', 'Urgences'],
    price: 10000,
    unit: 'module',
    color: 'orange'
  },
  {
    id: 'examens',
    name: 'Examens & plateau technique',
    items: ['Laboratoire', 'Imagerie médicale', 'Cardiologie', 'Anatomopathologie', 'Endoscopie', 'Bloc opératoire'],
    price: 10000,
    unit: 'module',
    color: 'violet'
  },
  {
    id: 'medicaments',
    name: 'Médicaments & stocks',
    items: ['Pharmacie', 'Stocks & Dépôts', 'Banque de sang'],
    price: 10000,
    unit: 'module',
    color: 'teal'
  },
  {
    id: 'intelligence',
    name: 'Intelligence & pilotage',
    items: ['Intelligence artificielle', 'Analyse & pilotage', 'Statistiques', 'Prévisions'],
    price: 10000,
    unit: 'module',
    color: 'pink',
    comingSoon: true
  },
  {
    id: 'signature',
    name: 'Signature à distance',
    items: ['Documents & contrats', 'Signature électronique', 'Suivi des documents'],
    price: 10000,
    unit: 'forfait',
    color: 'indigo'
  },
  { id: 'finance', name: 'Gestion financière', items: ['Comptabilité', 'Caisse'], price: 20000, unit: 'forfait', color: 'green' }
]
