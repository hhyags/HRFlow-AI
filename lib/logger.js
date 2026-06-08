const sensitiveKeys = /password|token|secret|authorization|cookie|api[-_]?key|salary|netpay|basesalary/i

function redact(value, depth = 0) {
  if (depth > 6) return '[truncated]'
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => redact(item, depth + 1))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      sensitiveKeys.test(key) ? '[redacted]' : redact(item, depth + 1),
    ]))
  }
  if (typeof value === 'string' && value.length > 4000) return `${value.slice(0, 4000)}...[truncated]`
  return value
}

function write(level, message, context = {}) {
  const configured = process.env.LOG_LEVEL || 'info'
  const weights = { debug: 10, info: 20, warn: 30, error: 40 }
  if ((weights[level] || 20) < (weights[configured] || 20)) return
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...redact(context),
  })
  if (level === 'error') console.error(entry)
  else if (level === 'warn') console.warn(entry)
  else console.log(entry)
}

export const logger = {
  debug: (message, context) => write('debug', message, context),
  info: (message, context) => write('info', message, context),
  warn: (message, context) => write('warn', message, context),
  error: (message, context) => write('error', message, context),
}

export async function reportError(error, context = {}) {
  logger.error(error?.message || 'Unhandled error', {
    ...context,
    errorName: error?.name,
    stack: error?.stack,
    digest: error?.digest,
  })
  if (!process.env.ERROR_MONITORING_WEBHOOK) return
  await fetch(process.env.ERROR_MONITORING_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(redact({
      message: error?.message || String(error),
      stack: error?.stack,
      context,
      timestamp: new Date().toISOString(),
    })),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {})
}
