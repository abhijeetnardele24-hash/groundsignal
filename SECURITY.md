# Security and privacy

## Supported version

Security fixes currently target the latest `main` branch.

## Reporting

Do not open a public issue containing personal telemetry, tokens, precise route
information, or an exploitable vulnerability. Contact the repository owner
privately through the security-reporting mechanism on the public repository.

## Design boundary

- The backend rejects unknown payload fields and accepts no raw sensor or
  location schema.
- Secrets are environment variables and must never be committed.
- Raw motion is local browser data and is capped when saved with a report.
- Local-first is not the same as encrypted or permanent. Device access, browser
  storage eviction, and user-created exports remain outside the application's
  protection boundary.
