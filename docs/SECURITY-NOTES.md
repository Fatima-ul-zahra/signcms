# Security and deployment notes

- Use HTTPS for any deployment reachable over the public internet.
- Use a long random JWT_SECRET and protect the `.env` file.
- The starter player device token is stored by the Electron renderer in localStorage; harden this before production (prefer Electron main-process secure storage such as safeStorage).
- Add device-token rotation, owner-controlled user management, CSRF strategy if cookie auth is adopted, malware scanning, backup/restore, monitoring, and stricter upload validation before production.
- Restrict MongoDB to trusted hosts; never expose MongoDB directly to the public internet.
- Keep test data in a separate database.
