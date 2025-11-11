const authRoutes = require('./auth')
const taskRoutes = require('./tasks')
const aiRoutes = require('./ai')
const statsRoutes = require('./stats')
const settingsRoutes = require('./settings')

module.exports = function registerRoutes(app) {
  app.use('/api/auth', authRoutes)
  app.use('/api/tasks', taskRoutes)
  app.use('/api/ai', aiRoutes)
  app.use('/api/stats', statsRoutes)
  app.use('/api/settings', settingsRoutes)
}
