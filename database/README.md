# Database

EduMind AI uses PostgreSQL for persistent storage.

- `schema.sql` contains the database schema used by the backend.
- The backend can also run with its in-memory mock store when `DATABASE_URL` is not configured.

Do not commit database credentials or `.env` files.
