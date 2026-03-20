import pg from "pg";

const { Pool } = pg;

export function createDb(config) {
    const pool = new Pool(config.db);

    return {
        query: (...args) => pool.query(...args),
        async checkConnected() {
            try {
                await pool.query("SELECT 1");
                return true;
            } catch {
                return false;
            }
        },
    };
}