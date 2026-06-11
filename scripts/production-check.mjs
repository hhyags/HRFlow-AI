import { spawnSync } from 'node:child_process'

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const commands = [
  [npm, ['run', 'env:validate']],
  [npm, ['run', 'prisma:generate']],
  [npm, ['run', 'prisma:validate']],
  [npm, ['run', 'db:status']],
  [npm, ['run', 'db:validate']],
  [npm, ['run', 'auth:reconcile']],
  [npm, ['run', 'test:coverage']],
  [npm, ['run', 'build']],
  [npm, ['audit', '--omit=dev']],
]

for (const [command, args] of commands) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status !== 0) process.exit(result.status || 1)
}
console.log('HRFlow AI production checks passed.')
