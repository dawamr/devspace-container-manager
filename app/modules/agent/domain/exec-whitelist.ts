/**
 * Commands the AI agent is allowed to execute inside a container.
 * Any command NOT in this list is rejected automatically.
 */
export const EXEC_WHITELIST = [
  'ls',
  'cat',
  'head',
  'tail',
  'grep',
  'find',
  'wc',
  'tree',
  'git status',
  'git diff',
  'git log',
  'git branch',
  'git show',
  'npm test',
  'npm run',
  'npx',
  'pnpm test',
  'pnpm run',
  'pnpm exec',
  'pnpm tsc',
  'yarn test',
  'yarn run',
  'node',
  'npx tsc --noEmit',
  'php artisan',
  'composer',
  'python',
  'python3',
  'pip',
  'go test',
  'go build',
  'go vet',
  'go fmt',
  'cargo test',
  'cargo build',
  'cargo check',
  'ruby',
  'bundle',
  'rake',
] as const

/** Shell operators that are strictly forbidden in exec commands. */
const FORBIDDEN_OPERATORS = ['&&', '||', ';', '|', '>', '<', '`', '$('] as const

/**
 * Check if a command starts with one of the whitelisted entries.
 * The command is trimmed and compared case-insensitively against the prefix.
 */
export function isWhitelisted(command: string): boolean {
  const trimmed = command.trim().toLowerCase()
  if (!trimmed) return false
  return EXEC_WHITELIST.some((allowed) => trimmed.startsWith(allowed.toLowerCase()))
}

/**
 * Reject commands containing shell operators that could chain or redirect.
 */
export function hasForbiddenOperators(command: string): boolean {
  return FORBIDDEN_OPERATORS.some((op) => command.includes(op))
}

/**
 * Validate a command for execution. Returns { valid, reason }.
 */
export function validateCommand(command: string): { valid: boolean; reason?: string } {
  if (!command || command.trim().length === 0) {
    return { valid: false, reason: 'Empty command' }
  }
  if (command.length > 500) {
    return { valid: false, reason: 'Command exceeds 500 character limit' }
  }
  if (hasForbiddenOperators(command)) {
    return { valid: false, reason: 'Command contains forbidden shell operators (&&, ||, ;, |, >, <, `, $()' }
  }
  if (!isWhitelisted(command)) {
    return { valid: false, reason: `Command not in whitelist. Allowed: ${EXEC_WHITELIST.join(', ')}` }
  }
  return { valid: true }
}
