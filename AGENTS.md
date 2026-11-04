## Backend

- Check nearby modules, services, DTOs, and utilities before adding new ones.
- Keep TypeScript types accurate; validate API inputs and external data at trust boundaries.
- Preserve existing response shapes and error behavior unless explicitly changing them.
- Use migrations for schema changes; never reset or discard existing data without explicit approval.
- Never expose secrets or sensitive data in responses or logs.
- For behavior changes, add or update focused tests and run relevant checks before finishing.
- Make the smallest change that fully fixes the issue; avoid unnecessary dependencies and abstractions.
