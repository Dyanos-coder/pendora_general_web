import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '../src/generated/prisma/client'

// Création (ou réinitialisation) d'un compte ADMIN du site — utilisé pour le tout premier compte,
// avant de pouvoir en créer d'autres depuis l'interface (page Comptes).
//   npm run admin:create -- <email> <mot-de-passe> "<Nom complet>"

async function main(): Promise<void> {
  const [email, password, ...nameParts] = process.argv.slice(2)
  const name = nameParts.join(' ') || 'Administrateur'
  if (!email || !password || password.length < 8) {
    console.error('Usage : npm run admin:create -- <email> <mot-de-passe (8 caractères min.)> "<Nom>"')
    process.exit(1)
  }

  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    })
  })
  const passwordHash = await bcrypt.hash(password, 12)
  const account = await prisma.account.upsert({
    where: { email: email.toLowerCase() },
    update: { passwordHash, role: 'ADMIN', isActive: true, name },
    create: { id: randomUUID(), email: email.toLowerCase(), name, passwordHash, role: 'ADMIN' }
  })
  console.log(`Compte ADMIN prêt : ${account.email}`)
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
