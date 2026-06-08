import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

export function getPrisma() {
  if (!globalForPrisma.__hrflowPrisma) {
    globalForPrisma.__hrflowPrisma = new PrismaClient()
  }
  return globalForPrisma.__hrflowPrisma
}
