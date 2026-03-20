import { readdir, readFile } from "node:fs/promises";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createBootstrapService({ db, config }) {
  async function init() {
    await db.query("CREATE EXTENSION IF NOT EXISTS timescaledb");

    const scriptNames = (await readdir(config.bootstrapSqlDir))
      .filter((name) => name.endsWith(".sql"))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    for (const scriptName of scriptNames) {
      const script = await readFile(`${config.bootstrapSqlDir}/${scriptName}`, "utf8");
      if (!script.trim()) continue;

      if (scriptName === "04-gold-continuous-aggregates.sql") {
        const statements = script
          .split(/;\s*\n/g)
          .map((part) => part.trim())
          .filter(Boolean);

        for (const statement of statements) {
          await db.query(`${statement};`);
        }
        continue;
      }

      await db.query(script);
    }
  }

  async function initWithRetry() {
    for (let attempt = 1; attempt <= config.bootstrapMaxAttempts; attempt += 1) {
      try {
        await init();
        return;
      } catch (error) {
        if (attempt === config.bootstrapMaxAttempts) throw error;
        console.error(`database bootstrap attempt ${attempt} failed: ${error.message}`);
        await sleep(config.bootstrapRetryDelayMs);
      }
    }
  }

  return { init, initWithRetry };
}
