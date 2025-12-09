const express = require('express')
const cors = require('cors')
const path = require('path')

const registerRoutes = require('./routes')

function createApp() {
  const app = express()

  app.use(cors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://studypal-ai-1.onrender.com'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }))
  app.use(express.json())

  // Health check - keep for uptime monitoring
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  registerRoutes(app)

  // Serve static files from the frontend build
  const publicDir = path.join(__dirname, '..', 'public')
  app.use(express.static(publicDir))

  // SPA fallback - serve index.html for all non-API routes
  app.use((req, res) => {
    // Return 404 JSON for API routes
    if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
      return res.status(404).json({ error: 'Route not yet implemented' })
    }

    // Serve index.html for all other routes (SPA routing)
    const indexPath = path.join(publicDir, 'index.html')
    res.sendFile(indexPath, (err) => {
      if (err) {
        res.status(404).json({ error: 'Frontend not found' })
      }
    })
  })

  return app
}

module.exports = createApp
