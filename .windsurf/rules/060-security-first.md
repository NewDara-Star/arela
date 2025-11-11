---
trigger: always_on
---

# Security First

## Principle

**Security is not a feature—it's a requirement.** Build it in from day one, not as an afterthought.

## The Security Mindset

Every line of code should answer:
1. **What could go wrong?**
2. **Who could exploit this?**
3. **What's the blast radius?**

## Non-Negotiables

### 1. Authentication & Authorization

✅ **Always:**
- Use established libraries (OAuth2, JWT)
- Hash passwords (bcrypt, argon2)
- Implement MFA for sensitive operations
- Session timeout after inactivity
- Rate limiting on auth endpoints

❌ **Never:**
- Roll your own crypto
- Store passwords in plain text
- Use MD5 or SHA1 for passwords
- Trust client-side validation alone
- Skip authorization checks

### 2. Input Validation

✅ **Always:**
- Validate on server side
- Sanitize user input
- Use parameterized queries
- Whitelist, don't blacklist
- Validate file uploads

❌ **Never:**
- Trust user input
- Concatenate SQL queries
- Execute user-provided code
- Allow arbitrary file uploads
- Skip validation "just this once"

### 3. Data Protection

✅ **Always:**
- Encrypt data at rest (AES-256)
- Encrypt data in transit (TLS 1.3)
- Use environment variables for secrets
- Rotate secrets regularly
- Log access to sensitive data

❌ **Never:**
- Commit secrets to git
- Log sensitive data
- Store credit cards (use Stripe/etc)
- Share secrets via Slack/email
- Use default credentials

### 4. API Security

✅ **Always:**
- Require authentication
- Implement rate limiting
- Validate content-type
- Use CORS properly
- Version your APIs

❌ **Never:**
- Expose internal IDs
- Return detailed error messages
- Allow unlimited requests
- Trust the Referer header
- Skip input validation

## Security Checklist

### Every PR Must Answer

- [ ] Does this handle user input? → Validated?
- [ ] Does this access data? → Authorized?
- [ ] Does this use secrets? → From env vars?
- [ ] Does this expose an API? → Rate limited?
- [ ] Does this store data? → Encrypted?
- [ ] Could this be exploited? → How prevented?

### Every Feature Must Have

- [ ] Authentication (who are you?)
- [ ] Authorization (what can you do?)
- [ ] Input validation (is this safe?)
- [ ] Error handling (no info leakage)
- [ ] Audit logging (who did what?)
- [ ] Rate limiting (prevent abuse)

## Common Vulnerabilities

### OWASP Top 10 (2024)

1. **Broken Access Control**
   - Check permissions on every request
   - Don't trust client-side checks
   - Test with different user roles

2. **Cryptographic Failures**
   - Use TLS everywhere
   - Don't roll your own crypto
   - Rotate keys regularly

3. **Injection**
   - Use parameterized queries
   - Validate all input
   - Escape output

4. **Insecure Design**
   - Threat model early
   - Security by default
   - Fail securely

5. **Security Misconfiguration**
   - Change default credentials
   - Disable debug in production
   - Keep dependencies updated

6. **Vulnerable Components**
   - Run `npm audit` weekly
   - Update dependencies
   - Monitor CVE databases

7. **Authentication Failures**
   - Implement MFA
   - Use secure session management
   - Rate limit login attempts

8. **Data Integrity Failures**
   - Verify data integrity
   - Use signed JWTs
   - Validate deserialization

9. **Logging Failures**
   - Log security events
   - Don't log sensitive data
   - Monitor logs actively

10. **SSRF**
    - Validate URLs
    - Use allowlists
    - Disable redirects

## Security Tools

### Required in CI/CD

```yaml
# .github/workflows/security.yml
- npm audit
- snyk test
- semgrep scan
- dependency-check
- secret-scan
```

### Required Locally

```bash
# Pre-commit hooks
- git-secrets
- detect-secrets
- eslint-plugin-security
```

## Incident Response

### When a Vulnerability is Found

1. **Assess** - Severity? Exploited? Blast radius?
2. **Contain** - Disable affected feature? Rotate secrets?
3. **Fix** - Patch immediately
4. **Test** - Verify fix works
5. **Deploy** - Hotfix to production
6. **Notify** - Users if data exposed
7. **Learn** - Post-mortem, prevent recurrence

### Severity Levels

**Critical (P0):**
- Data breach
- RCE vulnerability
- Auth bypass
- **Action:** Fix within 4 hours

**High (P1):**
- XSS vulnerability
- SQL injection
- Privilege escalation
- **Action:** Fix within 24 hours

**Medium (P2):**
- CSRF vulnerability
- Info disclosure
- Weak crypto
- **Action:** Fix within 1 week

**Low (P3):**
- Minor info leak
- Cosmetic issues
- **Action:** Fix in next sprint

## Security Culture

### Everyone's Responsibility

- Developers: Write secure code
- QA: Test for vulnerabilities
- DevOps: Secure infrastructure
- Product: Prioritize security
- CTO: Set security standards

### Security Champions

- Designate security champions per team
- Monthly security training
- Share vulnerability learnings
- Celebrate security wins

## Compliance

### GDPR/Privacy

- [ ] Data minimization
- [ ] User consent
- [ ] Right to deletion
- [ ] Data portability
- [ ] Breach notification (72h)

### SOC 2 / ISO 27001

- [ ] Access controls
- [ ] Encryption
- [ ] Audit logs
- [ ] Incident response plan
- [ ] Regular security reviews

## Red Flags

### 🚨 Stop Immediately

- Secrets in code
- SQL concatenation
- Eval() on user input
- Disabled auth "temporarily"
- Production DB in dev

### ⚠️ Fix This Sprint

- Missing input validation
- No rate limiting
- Outdated dependencies
- Missing audit logs
- Weak passwords allowed

## Metrics

Track monthly:

- **Vulnerability Count:** Open security issues
- **Time to Patch:** Days from discovery to fix
- **Dependency Age:** % dependencies < 6 months old
- **Audit Pass Rate:** % PRs passing security checks

**Healthy targets:**
- Vulnerability Count: 0 critical, < 5 high
- Time to Patch: < 24h critical, < 7d high
- Dependency Age: > 80%
- Audit Pass Rate: > 95%

## Summary

- Security is everyone's job
- Build it in, don't bolt it on
- Validate everything
- Encrypt everything
- Log everything (except secrets)
- Update everything
- Test everything

**Secure by default. Paranoid by design.**