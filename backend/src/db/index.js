const { Pool } = require('pg')

let pool
let cachedConfig

function buildConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'require' ? { rejectUnauthorized: false } : false
    }
  }

  return {
    host: process.env.PGHOST ?? 'localhost',
    port: Number.parseInt(process.env.PGPORT ?? '5432', 10),
    database: process.env.PGDATABASE ?? 'studypal',
    user: process.env.PGUSER ?? 'postgres',
    password: process.env.PGPASSWORD ?? undefined,
    ssl: process.env.DB_SSL === 'require' ? { rejectUnauthorized: false } : false
  }
}

async function connect() {
  if (pool) {
    return pool
  }

  if (!cachedConfig) {
    cachedConfig = buildConfig()
  }

  pool = await createPool(cachedConfig)
  return pool
}

function getPool() {
  if (!pool) {
    throw new Error('Database pool has not been initialised. Call connect() first.')
  }
  return pool
}

function query(text, params) {
  return getPool().query(text, params)
}

async function createPool(config) {
  const candidate = new Pool(config)
  try {
    await candidate.query('select 1')
    return candidate
  } catch (error) {
    await candidate.end()

    const shouldAttemptCreate =
      error.code === '3D000' && !process.env.DATABASE_URL && config.database

    if (shouldAttemptCreate) {
      await ensureDatabaseExists(config)
      return createPool(config)
    }

    throw error
  }
}

async function ensureDatabaseExists(config) {
  const adminPool = new Pool({
    ...config,
    database: 'postgres'
  })

  try {
    const dbName = config.database.replace(/"/g, '""')
    await adminPool.query(`CREATE DATABASE "${dbName}"`)
  } catch (error) {
    if (error.code !== '42P04') {
      throw error
    }
  } finally {
    await adminPool.end()
  }
}

module.exports = {
  connect,
  getPool,
  query
}
