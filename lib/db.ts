import postgres from 'postgres';

const globalForPostgres = globalThis as unknown as {
  sql: postgres.Sql | undefined;
};

// Clean string in case quotes were included in environment
const rawDbUrl = (process.env.DATABASE_URL || '').replace(/^["']|["']$/g, '');
const dbUrl = new URL(rawDbUrl);

// Only treat as local if hostname is actually localhost or a private LAN IP.
// Do NOT check sslmode absence -- the Supabase cloud pooler URL omits that param.
const isLocalDb =
  ['localhost', '127.0.0.1', '::1'].includes(dbUrl.hostname) ||
  dbUrl.hostname.startsWith('192.168.') ||
  dbUrl.hostname.startsWith('10.') ||
  dbUrl.searchParams.get('sslmode') === 'disable';

const sql = globalForPostgres.sql ?? postgres({
    host: dbUrl.hostname,
    port: Number(dbUrl.port) || 5432,
    database: dbUrl.pathname.replace(/^\//, ''),
    username: dbUrl.username,
    password: decodeURIComponent(dbUrl.password),
    // Local Docker Supabase container does NOT support TLS, so ssl must be false
    ssl: isLocalDb ? false : { rejectUnauthorized: false },
    // Supabase transaction pooler (port 6543 / PgBouncer) does not support prepared statements
    prepare: false,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
});

if (process.env.NODE_ENV !== 'production') {
    globalForPostgres.sql = undefined;
    globalForPostgres.sql = sql;
}

export default sql;
