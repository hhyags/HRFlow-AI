import { spawnSync } from 'node:child_process'

const npmCli = process.env.npm_execpath
if (!npmCli) {
  console.error('Unable to locate the npm CLI from the current environment.')
  process.exit(1)
}

const commands = [
  ['run', 'env:validate'],
  ['run', 'prisma:generate'],
  ['run', 'prisma:validate'],
  ['run', 'db:status'],
  ['run', 'db:validate'],
  ['run', 'auth:reconcile'],
  ['run', 'test:coverage'],
  ['run', 'build'],
  ['audit', '--omit=dev'],
]

for (const args of commands) {
  const result = spawnSync(process.execPath, [npmCli, ...args], { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status || 1)
}
console.log('HRFlow AI production checks passed.')
