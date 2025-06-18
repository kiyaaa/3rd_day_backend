const logger = require('../utils/logger');

// In-memory database tables
const tables = {
  users: [],
  experts: [],
  questions: [],
  chat_rooms: [],
  room_participants: [],
  messages: [],
  expert_matches: [],
  migrations: []
};

// Auto-increment IDs
const nextId = {
  users: 1,
  experts: 1,
  questions: 1,
  chat_rooms: 1,
  room_participants: 1,
  messages: 1,
  expert_matches: 1,
  migrations: 1
};

const query = async (text, params = []) => {
  const start = Date.now();
  const sqlLower = text.toLowerCase().trim();
  
  try {
    let result = { rows: [], rowCount: 0 };
    
    // Simple SQL parser for basic operations
    if (sqlLower.startsWith('select')) {
      result = handleSelect(text, params);
    } else if (sqlLower.startsWith('insert')) {
      result = handleInsert(text, params);
    } else if (sqlLower.startsWith('update')) {
      result = handleUpdate(text, params);
    } else if (sqlLower.startsWith('delete')) {
      result = handleDelete(text, params);
    } else if (sqlLower.startsWith('create table')) {
      // Ignore - tables already created
      result = { rows: [], rowCount: 0 };
    }
    
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Database query error:', error);
    throw error;
  }
};

function handleSelect(sql, params) {
  const match = sql.match(/from\s+(\w+)/i);
  if (!match) throw new Error('Invalid SELECT query');
  
  const tableName = match[1];
  let rows = [...(tables[tableName] || [])];
  
  // Handle WHERE clause
  const whereMatch = sql.match(/where\s+(.+?)(?:\s+group\s+by|\s+order\s+by|\s+limit|$)/is);
  if (whereMatch) {
    rows = filterRows(rows, whereMatch[1], params);
  }
  
  // Handle JOIN
  if (sql.includes('join')) {
    rows = handleJoins(rows, sql, params);
  }
  
  // Handle ORDER BY
  const orderMatch = sql.match(/order\s+by\s+(\w+)(?:\s+(asc|desc))?/i);
  if (orderMatch) {
    const field = orderMatch[1];
    const desc = orderMatch[2]?.toLowerCase() === 'desc';
    rows.sort((a, b) => {
      const val1 = a[field];
      const val2 = b[field];
      return desc ? (val2 > val1 ? 1 : -1) : (val1 > val2 ? 1 : -1);
    });
  }
  
  // Handle LIMIT
  const limitMatch = sql.match(/limit\s+(\d+)(?:\s+offset\s+(\d+))?/i);
  if (limitMatch) {
    const limit = parseInt(limitMatch[1]);
    const offset = parseInt(limitMatch[2] || 0);
    rows = rows.slice(offset, offset + limit);
  }
  
  return { rows, rowCount: rows.length };
}

function handleInsert(sql, params) {
  const match = sql.match(/insert\s+into\s+(\w+)\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)/i);
  if (!match) throw new Error('Invalid INSERT query');
  
  const tableName = match[1];
  const fields = match[2].split(',').map(f => f.trim());
  const id = nextId[tableName]++;
  
  const newRow = { id };
  fields.forEach((field, i) => {
    newRow[field] = params[i];
  });
  
  // Add timestamps
  newRow.created_at = new Date().toISOString();
  newRow.updated_at = newRow.created_at;
  
  tables[tableName].push(newRow);
  
  // Handle RETURNING clause
  if (sql.includes('returning')) {
    return { rows: [newRow], rowCount: 1 };
  }
  
  return { rows: [{ id }], rowCount: 1 };
}

function handleUpdate(sql, params) {
  const match = sql.match(/update\s+(\w+)\s+set\s+(.+?)\s+where\s+(.+?)(?:\s+returning|$)/i);
  if (!match) throw new Error('Invalid UPDATE query');
  
  const tableName = match[1];
  const setClause = match[2];
  const whereClause = match[3];
  
  const rows = tables[tableName] || [];
  const filtered = filterRows(rows, whereClause, params);
  
  // Parse SET clause
  const updates = {};
  const setParts = setClause.split(',');
  setParts.forEach((part, i) => {
    const [field] = part.split('=').map(s => s.trim());
    updates[field] = params[i];
  });
  
  // Apply updates
  filtered.forEach(row => {
    Object.assign(row, updates);
    row.updated_at = new Date().toISOString();
  });
  
  if (sql.includes('returning')) {
    return { rows: filtered, rowCount: filtered.length };
  }
  
  return { rows: [], rowCount: filtered.length };
}

function handleDelete(sql, params) {
  const match = sql.match(/delete\s+from\s+(\w+)\s+where\s+(.+)/i);
  if (!match) throw new Error('Invalid DELETE query');
  
  const tableName = match[1];
  const whereClause = match[2];
  
  const rows = tables[tableName] || [];
  const toDelete = filterRows(rows, whereClause, params);
  
  toDelete.forEach(row => {
    const index = rows.indexOf(row);
    if (index > -1) {
      rows.splice(index, 1);
    }
  });
  
  return { rows: [], rowCount: toDelete.length };
}

function filterRows(rows, whereClause, params) {
  // Simple WHERE clause parser - handles basic conditions
  const conditions = whereClause.split(/\s+and\s+/i);
  
  return rows.filter(row => {
    return conditions.every(condition => {
      const match = condition.match(/(\w+)\s*(=|!=|>|<|>=|<=)\s*\$(\d+)/);
      if (!match) return true;
      
      const field = match[1];
      const op = match[2];
      const paramIndex = parseInt(match[3]) - 1;
      const value = params[paramIndex];
      
      switch (op) {
        case '=': return row[field] == value;
        case '!=': return row[field] != value;
        case '>': return row[field] > value;
        case '<': return row[field] < value;
        case '>=': return row[field] >= value;
        case '<=': return row[field] <= value;
        default: return true;
      }
    });
  });
}

function handleJoins(rows, sql, params) {
  // Simple JOIN implementation
  const joinMatch = sql.match(/join\s+(\w+)\s+(\w+)?\s*on\s+([^where]+)/i);
  if (!joinMatch) return rows;
  
  const joinTable = joinMatch[1];
  const joinAlias = joinMatch[2] || joinTable;
  const joinCondition = joinMatch[3].trim();
  
  const joinRows = tables[joinTable] || [];
  const result = [];
  
  rows.forEach(row => {
    joinRows.forEach(joinRow => {
      // Simple join condition parser
      const match = joinCondition.match(/(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/);
      if (match) {
        const leftField = match[2];
        const rightField = match[4];
        
        if (row[leftField] === joinRow[rightField]) {
          const combined = { ...row };
          Object.keys(joinRow).forEach(key => {
            combined[`${joinAlias}_${key}`] = joinRow[key];
          });
          result.push(combined);
        }
      }
    });
  });
  
  return result.length > 0 ? result : rows;
}

const transaction = async (callback) => {
  try {
    const result = await callback({ query });
    return result;
  } catch (error) {
    throw error;
  }
};

// Initialize with some test data
const initializeTestData = () => {
  logger.info('Initializing in-memory database with test data');
  
  // Create admin user
  tables.users.push({
    id: nextId.users++,
    email: 'admin@yeongyul.com',
    password: '$2a$10$K.0N0K1234567890abcdefghijklmnopqrstuvwxyz', // "password"
    name: 'Admin User',
    role: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
};

// Initialize on load
initializeTestData();

module.exports = {
  query,
  transaction,
  tables, // Export for direct access in tests
  nextId
};