# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in PlumeNote, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Send an email to: `security@example.com` (replace with actual contact)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a detailed response within 7 days.

## Security Measures

### Authentication & Authorization

- **JWT**: Explicit algorithm whitelist (HS256) to prevent algorithm confusion attacks
- **JWT Secret**: Minimum 32 characters required, validated at startup
- **Password Hashing**: bcrypt with cost factor 12
- **LDAP**: Input sanitization per RFC 4515/4514 to prevent injection
- **Session Management**: Configurable timeout, HTTP-only cookies

### Data Validation

- **Zod Schemas**: Strict input validation before all Prisma queries
- **Prisma**: Parameterized queries (no raw SQL with user input)
- **DOMPurify**: HTML sanitization for user-generated content
- **File Uploads**: Size limits, format validation, path traversal protection

### Frontend Security

- **TipTap Links**: URL protocol validation (blocks javascript:, data:, etc.)
- **Mermaid**: securityLevel: 'strict', DOMPurify SVG sanitization
- **KaTeX**: Trust function for URL validation, macro expansion limits
- **CSP Headers**: Configured via Nginx

### Real-time Collaboration

- **Hocuspocus/Yjs**: Mandatory JWT authentication in production
- **WebSocket**: Connection rate limiting via Throttle extension
- **Document Access**: Permission checks before document access

### Infrastructure (Docker)

- **Containers**: Run as non-root, no-new-privileges, capability dropping
- **Networks**: Internal network for databases (no direct internet access)
- **Redis**: Dangerous commands disabled (FLUSHDB, CONFIG, DEBUG)
- **Nginx**: Rate limiting (10r/s API, 1r/s login), security headers

### CI/CD Security

- **CodeQL**: Weekly static analysis with security-extended queries
- **npm audit**: Critical vulnerabilities block builds
- **Trivy**: Docker image scanning
- **TruffleHog**: Secrets detection in commits
- **Dependency Review**: Blocks high-severity vulnerabilities in PRs

## Security Best Practices

### For Contributors

- Never commit credentials, API keys, or secrets
- Use `.env.example` files with placeholder values
- All `.env` files are gitignored
- Review the [CONTRIBUTING.md](CONTRIBUTING.md) guidelines
- Run `npm audit` before submitting PRs

### For Deployers

- Generate strong, unique secrets for:
  - `JWT_SECRET` (min 32 characters)
  - `COOKIE_SECRET` (min 32 characters)
  - `POSTGRES_PASSWORD`
  - `REDIS_PASSWORD`
- Use HTTPS in production (see `docker/nginx/nginx-ssl.conf.template`)
- Keep dependencies updated (`npm update`, `docker pull`)
- Review Docker Compose security settings before deploying
- Enable rate limiting (enabled by default)

### Secrets Generation

```bash
# Generate a secure random secret
openssl rand -base64 32

# Generate all required secrets
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "COOKIE_SECRET=$(openssl rand -base64 32)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"
echo "REDIS_PASSWORD=$(openssl rand -base64 24)"
```

## Security Headers

The application sets the following security headers via Nginx:

| Header | Value |
|--------|-------|
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'unsafe-eval'; ...` |
| X-Frame-Options | `SAMEORIGIN` |
| X-Content-Type-Options | `nosniff` |
| X-XSS-Protection | `1; mode=block` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | `geolocation=(), microphone=(), camera=()` |

## Audit History

| Date       | Auditor  | Scope                    | Result  |
|------------|----------|--------------------------|---------|
| 2025-12-24 | Internal | Full security audit      | Remediated |
| 2025-12-12 | Internal | Pre-release docs         | Passed  |

### December 2025 Security Audit Fixes

**Critical (7 issues - all fixed):**
- Updated sharp to >=0.32.6 (CVE-2023-4863 libwebp RCE)
- Updated unzipper to >=0.8.13 (CVE-2018-1002203 Zip Slip)
- Added Redis authentication and command restrictions
- Added Zip Slip path traversal protection
- Updated vitest to >=1.6.1 (CVE-2025-24964 RCE)
- Updated mermaid to >=11.10.0 (CVE-2025-54881 XSS)
- Added LDAP injection protection

**High (12 issues - all fixed):**
- Configured JWT with explicit algorithm whitelist
- Added TipTap Link URL validation
- Configured KaTeX trust function
- Added Docker container hardening
- Implemented rate limiting in Nginx
- Added security headers

**Medium (8 issues - all fixed):**
- Updated vite to >=5.4.19 (CVE-2025-30208)
- Updated zod to >=3.22.4 (ReDoS)
- Added input validation schemas
- Updated playwright to >=1.56.0
