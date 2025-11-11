require('dotenv').config()
const fs = require('fs')
const path = require('path')
const db = require('./index')

async function initDatabase() {
  try {
    console.log('Connecting to database...')
    await db.connect()

    console.log('Reading schema.sql...')
    const schemaPath = path.join(__dirname, 'schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')

    console.log('Executing schema...')
    await db.query(schema)

    console.log('✅ Database initialized successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Failed to initialize database:', error)
    process.exit(1)
  }
}

initDatabase()
