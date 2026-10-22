import postgres from 'postgres';

const globalForPostgres = globalThis as unknown as {
  sql: postgres.Sql | undefined;
};

const dbUrl = new URL(process.env.DATABASE_URL!);

const sql = globalForPostgres.sql ?? postgres({
    host: dbUrl.hostname,
    port: Number(dbUrl.port) || 5432,
    database: dbUrl.pathname.replace(/^\//, ''),
    username: dbUrl.username,
    password: decodeURIComponent(dbUrl.password),
    ssl: { rejectUnauthorized: false },
    max: 10,
    idle_timeout: 30,
    connect_timeout: 30,
});

if (process.env.NODE_ENV !== 'production') globalForPostgres.sql = sql;

export default sql;
