import mariadb, { type Connection } from 'mariadb'

// Diagnostic de mise en ligne : variables d'environnement présentes (jamais leurs valeurs) et accès
// à la base du site. Ne renvoie que des noms et des codes d'erreur, rien de sensible.

export const dynamic = 'force-dynamic'

const REQUIRED = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'SESSION_SECRET', 'CREDENTIALS_KEY', 'SITE_URL', 'SUBSCRIPTION_PRIVATE_KEY', 'MONEYFUSION_API_URL']
const TABLES = ['account', 'hospital', 'audit_log', 'contact_request', 'price_item', 'payment', 'device']

export async function GET() {
  const missingEnv = REQUIRED.filter((name) => !process.env[name])
  const warnings: string[] = []
  if (process.env.DB_HOST === 'localhost' || process.env.DB_HOST === '127.0.0.1') {
    warnings.push("DB_HOST vaut localhost : sur Vercel il faut l'hôte distant de la base (ex. srvXXX.hstgr.io).")
  }
  if (process.env.SESSION_SECRET === 'change-me') warnings.push('SESSION_SECRET non personnalisé.')

  let database: { ok: boolean; error?: string; missingTables?: string[]; migrations?: number } = { ok: false }
  let connection: Connection | undefined
  try {
    connection = await mariadb.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectTimeout: 8000
    })
    const rows = (await connection.query('SHOW TABLES')) as Record<string, string>[]
    const present = new Set(rows.map((r) => Object.values(r)[0]))
    const migrations = present.has('_prisma_migrations')
      ? Number(((await connection.query('SELECT COUNT(*) AS n FROM _prisma_migrations WHERE finished_at IS NOT NULL')) as { n: unknown }[])[0]?.n)
      : 0
    database = { ok: true, missingTables: TABLES.filter((t) => !present.has(t)), migrations }
  } catch (error) {
    const e = error as { code?: string; errno?: number }
    database = { ok: false, error: `${e.code ?? 'ERREUR'}${e.errno ? ` (${e.errno})` : ''}` }
  } finally {
    await connection?.end().catch(() => undefined)
  }

  return Response.json({ missingEnv, warnings, database })
}
