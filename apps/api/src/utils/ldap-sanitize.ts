// ===========================================
// LDAP Sanitization Utilities
// Prevents LDAP injection attacks (RFC 4515/4514)
// ===========================================

/**
 * Escapes special characters in LDAP filter strings according to RFC 4515.
 * Prevents LDAP injection attacks.
 *
 * Characters escaped: \ * ( ) NUL /
 *
 * @example
 * escapeLdapFilter("user*admin") // Returns "user\2aadmin"
 * escapeLdapFilter("user)(uid=admin") // Returns "user\29\28uid=admin"
 */
export function escapeLdapFilter(input: string): string {
  if (!input) return '';

  return input
    .replace(/\\/g, '\\5c')  // \ must be escaped first
    .replace(/\*/g, '\\2a')
    .replace(/\(/g, '\\28')
    .replace(/\)/g, '\\29')
    .replace(/\0/g, '\\00')
    .replace(/\//g, '\\2f');
}

/**
 * Escapes special characters in LDAP DN strings according to RFC 4514.
 * Used for Distinguished Names in LDAP operations.
 *
 * Characters escaped: \ " + , ; < > =
 *
 * @example
 * escapeLdapDn("John Doe, Jr.") // Returns "John Doe\, Jr."
 */
export function escapeLdapDn(input: string): string {
  if (!input) return '';

  return input
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\+/g, '\\+')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/</g, '\\<')
    .replace(/>/g, '\\>')
    .replace(/=/g, '\\=');
}

/**
 * Validates that a username contains only safe characters.
 * Rejects usernames with LDAP injection patterns.
 */
export function isValidLdapUsername(username: string): boolean {
  if (!username || username.length > 256) {
    return false;
  }

  // Allow only alphanumeric, dots, hyphens, underscores
  const safePattern = /^[a-zA-Z0-9._-]+$/;
  return safePattern.test(username);
}
