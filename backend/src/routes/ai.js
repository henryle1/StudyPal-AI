const express = require('express')

const router = express.Router()

router.post('/plan', (_req, res) => {
  res.json({
    provider: 'placeholder',
    plan: {
      summary: 'AI planning to be implemented.',
      dailySchedule: [],
      tips: ['Add API integration once Gemini/other service is ready.']
    }
  })
})

router.get('/history', (_req, res) => {
  res.json({ history: [] })
})

module.exports = router
