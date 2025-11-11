const express = require('express')
const cors = require('cors')
const path = require('path')

const registerRoutes = require('./routes')

function createApp() {
  const app = express()

  app.use(cors({
    origin: '*',
    methods: '*',
    allowedHeaders: '*'
  }))
  app.use(express.json())

  // Health check - keep for uptime monitoring
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  registerRoutes(app)

  // Placeholder static hosting (optional)
  const publicDir = path.join(__dirname, '..', 'public')
  app.use(express.static(publicDir))

  // Fallback handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not yet implemented' })
  })

  return app
}

module.exports = createApp
