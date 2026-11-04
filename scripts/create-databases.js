import postgres from 'postgres';

import { config } from "dotenv"
config({ path: ".env.local" })

// Setup de 2 bancos: Neon (DATABASE_URL, principal) e warehouse local (DATABASE_URL_LOCAL).
// Este script garante que o banco do warehouse local existe no servidor local.
const LOCAL_URL = process.env.DATABASE_URL_LOCAL;

function adminUrl(dbUrl) {
    const url = new URL(dbUrl);
    url.pathname = '/postgres';
    return url.toString();
}

async function createDatabases() {
    if (!LOCAL_URL) {
        console.error('DATABASE_URL_LOCAL nao configurada no .env.local');
        return;
    }

    const targetDb = new URL(LOCAL_URL).pathname.replace(/^\//, '');
    const sql = postgres(adminUrl(LOCAL_URL), { prepare: false });

    try {
        console.log(`Creating database: ${targetDb}`);
        await sql.unsafe(`CREATE DATABASE "${targetDb}"`);
        console.log(`✓ Database ${targetDb} created successfully`);
    } catch (error) {
        if (error.message.includes('already exists')) {
            console.log('Database already exists, skipping creation');
        } else {
            console.error('Error creating database:', error.message);
        }
    } finally {
        await sql.end();
    }
}

createDatabases();
