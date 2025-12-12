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

## Security Best Practices

### For Contributors

- Never commit credentials, API keys, or secrets
- Use `.env.example` files with placeholder values
- All `.env` files are gitignored
- Review the [CONTRIBUTING.md](CONTRIBUTING.md) guidelines

### For Deployers

- Generate strong, unique secrets for:
  - `JWT_SECRET` (min 32 characters)
  - `COOKIE_SECRET` (min 32 characters)
  - `POSTGRES_PASSWORD`
  - `REDIS_PASSWORD`
- Use HTTPS in production
- Keep dependencies updated
- Follow the principle of least privilege

### Secrets Generation

```bash
# Generate a secure random secret
openssl rand -base64 32
```

## Known Security Considerations

- WebSocket connections require authentication
- Session tokens expire after configurable timeout
- Rate limiting is enabled by default
- CORS is configured per environment

## Audit History

| Date       | Auditor | Scope              | Result |
|------------|---------|-------------------|--------|
| 2025-12-12 | Internal | Pre-release docs  | Passed |
