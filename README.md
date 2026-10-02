# pandora-web — Console Pandora

Site général de Pandora (Next.js 16) : suivi des hôpitaux clients, comptes Admin / Prospecteur, et à venir les abonnements MoneyFusion et la vérification des reçus de caisse. Plan complet et décisions : [`../Plan-Site-Pandora.md`](../Plan-Site-Pandora.md).

## Démarrage

```bash
npm install
cp .env.example .env        # puis compléter (base du site, SESSION_SECRET, CREDENTIALS_KEY…)
npx prisma migrate deploy   # crée les tables dans la base du site
npm run prisma:generate
npm run admin:create -- admin@exemple.com "MotDePasse" "Nom complet"   # premier compte admin
npm run dev                 # http://localhost:3000
```

⚠️ `CREDENTIALS_KEY` chiffre les mots de passe des bases des hôpitaux. **Ne jamais la perdre ni la changer** : les accès enregistrés deviendraient illisibles.

## Scripts

- `npm run dev` : serveur de développement
- `npm run build` / `npm start` : build et serveur de production — le build applique d’abord les migrations de la base du site (`prisma migrate deploy`), y compris sur Vercel : un déploiement ne peut donc plus partir avec une base en retard
- `npm run typecheck` : génération des types de routes + `tsc`
- `npm run lint` : ESLint
- `npm run admin:create -- <email> <mot-de-passe> "<Nom>"` : crée ou réinitialise un compte admin
- `npx prisma migrate dev --name <nom>` : nouvelle migration de la base du site (développement)

## Organisation

| Dossier | Contenu |
| --- | --- |
| `prisma/` | Schéma et migrations de la base du site (comptes, hôpitaux, journal) |
| `src/proxy.ts` | Redirection vers `/login` des visiteurs non connectés (Next.js 16 : ex « middleware ») |
| `src/lib/` | Accès à la base du site, sessions, chiffrement, lecture des bases des hôpitaux (`hospital-db.ts`) |
| `src/app/actions/` | Actions serveur : connexion, hôpitaux, comptes |
| `src/app/(console)/` | Pages de la console : tableau de bord, hôpitaux, comptes |

## Droits

- **Admin** : tout. Ajout manuel des hôpitaux (accès à leur base, testés avant enregistrement), modification des accès, gestion des comptes.
- **Prospecteur** : consultation du tableau de bord et des hôpitaux, choix de la version mobile (non souhaitée / souhaitée / installée). Ne voit jamais les accès aux bases.

## Lecture des bases des hôpitaux

Le site se connecte à la base de chaque hôpital en **lecture seule** pour afficher :
- les modules installés ;
- le nombre de patients et d'utilisateurs actifs ;
- les consultations et les montants encaissés en caisse du mois ;
- la version du schéma de la base ;
- la dernière activité.

Chaque base est interrogée avec un délai court : une base injoignable est signalée sans bloquer le reste. Le résultat est gardé en mémoire 2 minutes, et le bouton « Actualiser » force une relecture.

L'hébergement retenu n'a pas d'IP fixe : chaque base d'hôpital doit donc autoriser les connexions distantes depuis toutes les IP (`%`, « MySQL distant » chez Hostinger).
