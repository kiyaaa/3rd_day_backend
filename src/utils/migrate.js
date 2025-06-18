const fs = require('fs').promises;
const path = require('path');
const { query } = require('../models/database');
const logger = require('./logger');

const runMigrations = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migrationDir = path.join(__dirname, '../../migrations');
    const files = await fs.readdir(migrationDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    for (const file of sqlFiles) {
      const { rows } = await query(
        'SELECT * FROM migrations WHERE filename = $1',
        [file]
      );

      if (rows.length === 0) {
        logger.info(`Running migration: ${file}`);
        const sql = await fs.readFile(path.join(migrationDir, file), 'utf8');
        
        await query(sql);
        await query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [file]
        );
        
        logger.info(`Migration completed: ${file}`);
      } else {
        logger.info(`Skipping migration: ${file} (already executed)`);
      }
    }

    logger.info('All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigrations();