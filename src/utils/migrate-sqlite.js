const fs = require('fs').promises;
const path = require('path');
const { db } = require('../models/database');
const logger = require('./logger');

const runMigrations = async () => {
  try {
    // Create migrations table
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filename VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const migrationDir = path.join(__dirname, '../../migrations');
    const files = await fs.readdir(migrationDir);
    const sqlFiles = files.filter(f => f.endsWith('_sqlite.sql')).sort();

    for (const file of sqlFiles) {
      const existingMigration = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM migrations WHERE filename = ?', [file], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!existingMigration) {
        logger.info(`Running migration: ${file}`);
        const sql = await fs.readFile(path.join(migrationDir, file), 'utf8');
        
        // Split SQL statements and execute them one by one
        const statements = sql.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
          await new Promise((resolve, reject) => {
            db.run(statement, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
        
        await new Promise((resolve, reject) => {
          db.run('INSERT INTO migrations (filename) VALUES (?)', [file], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
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