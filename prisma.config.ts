import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// Accès à la base du site : champs séparés (comme chez l'hébergeur), encodés dans une URL pour la
// CLI Prisma (migrations). L'application, elle, passe par l'adaptateur mariadb (src/lib/db.ts).
function databaseUrl(): string {
  const user = encodeURIComponent(process.env.DB_USER ?? '')
  const password = encodeURIComponent(process.env.DB_PASSWORD ?? '')
  return `mysql://${user}:${password}@${process.env.DB_HOST ?? 'localhost'}:${process.env.DB_PORT ?? '3306'}/${process.env.DB_NAME ?? 'pandora_web'}`
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: databaseUrl() }
})
