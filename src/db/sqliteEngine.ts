import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { ProjectEstimate } from '../types';

let dbInstance: Database | null = null;
let SQL: SqlJsStatic | null = null;

const IDB_NAME = 'CivilEstimateDB';
const IDB_STORE = 'sqlite_binary';
const IDB_KEY = 'latest_db';

// Helper for IndexedDB persistence
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveDBToIndexedDB(data: Uint8Array) {
  try {
    const idb = await openIndexedDB();
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(data, IDB_KEY);
  } catch (err) {
    console.warn('[SQLite] Failed to persist DB to IndexedDB:', err);
  }
}

async function loadDBFromIndexedDB(): Promise<Uint8Array | null> {
  try {
    const idb = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function getSQLiteDB(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`
    });
  }

  const savedBuffer = await loadDBFromIndexedDB();
  if (savedBuffer) {
    dbInstance = new SQL.Database(savedBuffer);
    console.log('[SQLite] Restored SQLite DB from IndexedDB storage.');
  } else {
    dbInstance = new SQL.Database();
    console.log('[SQLite] Created new in-memory SQLite DB.');
    bootstrapSQLiteSchema(dbInstance);
  }

  return dbInstance;
}

function bootstrapSQLiteSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      zone TEXT,
      fiscal_year TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS boq_items (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      item_code TEXT,
      description TEXT,
      unit TEXT,
      estimated_quantity REAL,
      user_rate REAL,
      contractor_rate REAL,
      total_amount REAL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mb_rows (
      id TEXT PRIMARY KEY,
      boq_item_id TEXT,
      particulars TEXT,
      no_of_units REAL,
      length REAL,
      breadth REAL,
      height REAL,
      quantity REAL,
      remarks TEXT,
      FOREIGN KEY(boq_item_id) REFERENCES boq_items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS zone_rates (
      id TEXT PRIMARY KEY,
      zone TEXT,
      category TEXT,
      item_name TEXT,
      unit TEXT,
      rate REAL
    );
  `);
}

/**
 * Syncs a ProjectEstimate into SQLite database tables and saves to IndexedDB
 */
export async function syncProjectToSQLite(project: ProjectEstimate) {
  const db = await getSQLiteDB();

  db.run(
    `INSERT OR REPLACE INTO projects (id, name, zone, fiscal_year, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      project.id,
      project.title,
      project.zone,
      project.fiscal_year,
      project.created_at || new Date().toISOString(),
      new Date().toISOString()
    ]
  );

  if (project.items) {
    project.items.forEach((item) => {
      db.run(
        `INSERT OR REPLACE INTO boq_items (id, project_id, item_code, description, unit, estimated_quantity, user_rate, contractor_rate, total_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          project.id,
          item.item_code,
          item.description,
          item.unit,
          item.estimated_quantity,
          item.user_rate || 0,
          item.contractor_rate || 0,
          item.total_amount
        ]
      );

      if (item.mb_rows) {
        item.mb_rows.forEach((r) => {
          db.run(
            `INSERT OR REPLACE INTO mb_rows (id, boq_item_id, particulars, no_of_units, length, breadth, height, quantity, remarks)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              r.id,
              item.id,
              r.particulars,
              Number(r.no_of_units) || 0,
              Number(r.length) || 0,
              Number(r.breadth) || 0,
              Number(r.height) || 0,
              Number(r.quantity) || 0,
              r.remarks || ''
            ]
          );
        });
      }
    });
  }

  const binary = db.export();
  await saveDBToIndexedDB(binary);
}

/**
 * Runs a raw SQL query on the SQLite DB
 */
export async function executeRawSQL(sqlQuery: string): Promise<{ columns: string[]; values: any[][] }> {
  const db = await getSQLiteDB();
  const res = db.exec(sqlQuery);
  if (!res || res.length === 0) {
    return { columns: [], values: [] };
  }
  return {
    columns: res[0].columns,
    values: res[0].values
  };
}

/**
 * Downloads the binary .sqlite database file directly for offline local archiving
 */
export async function downloadSQLiteDatabaseFile(filename = 'uev_database.sqlite') {
  const db = await getSQLiteDB();
  const binary = db.export();
  const blob = new Blob([binary], { type: 'application/x-sqlite3' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generates PostgreSQL DDL script for seamless migration from SQLite to PostgreSQL
 */
export function generatePostgreSQLMigrationSQL(project: ProjectEstimate): string {
  let sql = `-- Universal Estimating & Valuation (UEV) PostgreSQL Migration DDL Script
-- Generated at: ${new Date().toISOString()}
-- Target Database: PostgreSQL 12+ / Cloud SQL

CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  zone VARCHAR(100),
  fiscal_year VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS boq_items (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
  item_code VARCHAR(50),
  description TEXT,
  unit VARCHAR(50),
  estimated_quantity NUMERIC(15, 4),
  user_rate NUMERIC(15, 2),
  contractor_rate NUMERIC(15, 2),
  total_amount NUMERIC(15, 2)
);

CREATE TABLE IF NOT EXISTS mb_rows (
  id VARCHAR(64) PRIMARY KEY,
  boq_item_id VARCHAR(64) REFERENCES boq_items(id) ON DELETE CASCADE,
  particulars TEXT,
  no_of_units NUMERIC(15, 4),
  length NUMERIC(15, 4),
  breadth NUMERIC(15, 4),
  height NUMERIC(15, 4),
  quantity NUMERIC(15, 4),
  remarks TEXT
);

-- Insert Project
INSERT INTO projects (id, name, zone, fiscal_year)
VALUES ('${project.id}', '${(project.title || '').replace(/'/g, "''")}', '${(project.zone || '').replace(/'/g, "''")}', '${project.fiscal_year}')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP;

`;

  project.items.forEach((item) => {
    sql += `INSERT INTO boq_items (id, project_id, item_code, description, unit, estimated_quantity, user_rate, contractor_rate, total_amount)
VALUES ('${item.id}', '${project.id}', '${item.item_code}', '${item.description.replace(/'/g, "''")}', '${item.unit}', ${item.estimated_quantity}, ${item.user_rate || 0}, ${item.contractor_rate || 0}, ${item.total_amount})
ON CONFLICT (id) DO UPDATE SET estimated_quantity = EXCLUDED.estimated_quantity, total_amount = EXCLUDED.total_amount;\n`;

    if (item.mb_rows) {
      item.mb_rows.forEach((r) => {
        sql += `INSERT INTO mb_rows (id, boq_item_id, particulars, no_of_units, length, breadth, height, quantity, remarks)
VALUES ('${r.id}', '${item.id}', '${(r.particulars || '').replace(/'/g, "''")}', ${Number(r.no_of_units) || 0}, ${Number(r.length) || 0}, ${Number(r.breadth) || 0}, ${Number(r.height) || 0}, ${Number(r.quantity) || 0}, '${(r.remarks || '').replace(/'/g, "''")}')
ON CONFLICT (id) DO UPDATE SET quantity = EXCLUDED.quantity;\n`;
      });
    }
  });

  return sql;
}
