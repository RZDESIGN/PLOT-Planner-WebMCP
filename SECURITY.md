# Security policy

## Supported version

Security fixes are applied to the latest code on `main`.

## Reporting a vulnerability

Please do not open a public issue for vulnerabilities involving authentication, Row Level Security, invitation tokens, Realtime authorization or data exposure.

Use GitHub's private vulnerability reporting for this repository when available. If it is unavailable, contact the maintainer privately through the repository owner's GitHub profile and include:

- the affected feature or endpoint;
- the minimum steps needed to reproduce the problem;
- the expected and actual authorization behavior;
- whether any real user data may have been exposed.

Do not include live credentials, reusable invitation tokens or personal data in the report.

## Security boundaries

- The browser uses only the Supabase publishable key.
- Supabase RLS is the authoritative access boundary.
- Owners and editors may mutate shared sprint state; live viewers are read-only.
- Multi-row mutation RPCs run with narrowly scoped grants and explicit board-role checks.
- Invitation tokens are one-use, expire after seven days and are stored only as SHA-256 hashes.
