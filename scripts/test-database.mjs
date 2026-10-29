// The same PostgreSQL extensions used in production, inside isolated in-memory databases.
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { postgis } from '@electric-sql/pglite-postgis';
export const createTestDatabase = (options = {}) => new PGlite({ ...options, extensions: { pg_trgm, postgis } });
