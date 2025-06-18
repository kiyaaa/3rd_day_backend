const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../utils/logger');

const dbPath = path.join(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  logger.info('SQLite database connected');
});

const query = (text, params = []) => {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    
    if (text.toLowerCase().startsWith('select')) {
      db.all(text, params, (err, rows) => {
        const duration = Date.now() - start;
        if (err) {
          logger.error('Database query error:', err);
          reject(err);
        } else {
          logger.debug('Executed query', { text, duration, rows: rows.length });
          resolve({ rows, rowCount: rows.length });
        }
      });
    } else {
      db.run(text, params, function(err) {
        const duration = Date.now() - start;
        if (err) {
          logger.error('Database query error:', err);
          reject(err);
        } else {
          logger.debug('Executed query', { text, duration, changes: this.changes });
          resolve({ 
            rows: [{ id: this.lastID }], 
            rowCount: this.changes 
          });
        }
      });
    }
  });
};

const transaction = async (callback) => {
  try {
    await query('BEGIN TRANSACTION');
    const result = await callback({ query });
    await query('COMMIT');
    return result;
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }
};

module.exports = {
  query,
  transaction,
  db
};