/**
 * Lightweight input validation helpers — no external dependencies.
 * Usage: const { errors, valid } = validate(data, rules)
 */

export function validate(data, rules) {
  const errors = {};

  for (const [field, checks] of Object.entries(rules)) {
    const value = data[field];

    if (checks.required && (value === undefined || value === null || value === '')) {
      errors[field] = `${field} est requis`;
      continue;
    }

    if (value === undefined || value === null || value === '') continue;

    if (checks.type === 'number') {
      const num = Number(value);
      if (isNaN(num)) { errors[field] = `${field} doit être un nombre`; continue; }
      if (checks.min !== undefined && num < checks.min) errors[field] = `${field} doit être ≥ ${checks.min}`;
      if (checks.max !== undefined && num > checks.max) errors[field] = `${field} doit être ≤ ${checks.max}`;
    }

    if (checks.type === 'string') {
      const str = String(value);
      if (checks.minLength && str.length < checks.minLength) errors[field] = `${field} doit avoir au moins ${checks.minLength} caractères`;
      if (checks.maxLength && str.length > checks.maxLength) errors[field] = `${field} trop long (max ${checks.maxLength})`;
    }

    if (checks.enum && !checks.enum.includes(value)) {
      errors[field] = `${field} invalide`;
    }
  }

  return { errors, valid: Object.keys(errors).length === 0 };
}

/**
 * Sanitize an integer param from URL searchParams.
 * Returns null if missing or not a positive integer.
 */
export function parseId(raw) {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Sanitize pagination params from URL searchParams.
 */
export function parsePagination(searchParams, defaultLimit = 100) {
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || defaultLimit, 10) || defaultLimit, 1), 500);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);
  return { limit, offset };
}
