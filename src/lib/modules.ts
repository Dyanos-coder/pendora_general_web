// Modules de l'application des hôpitaux (miroir de app-core/src/shared/setup-types.ts) — pour
// afficher les modules installés d'un hôpital avec leur libellé et leur groupe.

export const MODULE_GROUPS: { label: string; modules: { id: string; label: string }[] }[] = [
  {
    label: 'Soins & Patients',
    modules: [
      { id: 'patients', label: 'Patients' },
      { id: 'appointments', label: 'Rendez-vous' },
      { id: 'consultations', label: 'Consultations' },
      { id: 'hospitalization', label: 'Hospitalisation' },
      { id: 'emergencies', label: 'Urgences' },
      { id: 'operating-room', label: 'Bloc opératoire' }
    ]
  },
  {
    label: 'Examens & plateau technique',
    modules: [
      { id: 'laboratory', label: 'Laboratoire' },
      { id: 'imaging', label: 'Imagerie médicale' },
      { id: 'cardiology', label: 'Cardiologie' },
      { id: 'pathology', label: 'Anatomopathologie' },
      { id: 'endoscopy', label: 'Endoscopie' }
    ]
  },
  {
    label: 'Médicaments & stocks',
    modules: [
      { id: 'pharmacy', label: 'Pharmacie' },
      { id: 'stocks', label: 'Stocks & Dépôts' },
      { id: 'blood-bank', label: 'Banque de sang' }
    ]
  },
  {
    label: 'Finance',
    modules: [
      { id: 'cashier', label: 'Caisse' },
      { id: 'finance', label: 'Comptabilité' }
    ]
  },
  {
    label: 'Administration',
    modules: [
      { id: 'procurement', label: 'Approvisionnement' },
      { id: 'hr', label: 'Ressources Humaines' }
    ]
  },
  {
    label: 'Gouvernance & qualité',
    modules: [
      { id: 'quality', label: 'Qualité & Accréditation' },
      { id: 'risk-management', label: 'Gestion des risques' },
      { id: 'audit-compliance', label: 'Audit & Conformité' },
      { id: 'documents', label: 'Documents & signature électronique' }
    ]
  },
  {
    label: 'Intelligence & pilotage',
    modules: [
      { id: 'ai-predictions', label: 'IA & Prédictions' },
      { id: 'analytics', label: 'Rapports & Analyse' },
      { id: 'automation-studio', label: 'Automation Studio' }
    ]
  }
]

export const ALL_MODULE_IDS = MODULE_GROUPS.flatMap((g) => g.modules.map((m) => m.id))

export const MODULE_LABEL: Record<string, string> = Object.fromEntries(
  MODULE_GROUPS.flatMap((g) => g.modules.map((m) => [m.id, m.label]))
)
