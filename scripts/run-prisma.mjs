import { spawnSync } from 'node:child_process'
import nextEnv from '@next/env'

nextEnv.loadEnvConfig(process.cwd())

const prismaCli = new URL('../node_modules/prisma/build/index.js', import.meta.url)
const result = spawnSync(process.execPath, [prismaCli.pathname.slice(1), ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
})

process.exit(result.status ?? 1)
