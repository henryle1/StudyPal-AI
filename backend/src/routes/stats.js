const express = require('express')

const router = express.Router()

router.get('/overview', (_req, res) => {
  res.json({
    totals: { totalTasks: 0, completedTasks: 0, pendingTasks: 0 },
    weeklyProgress: [],
    streakDays: 0,
    upcomingTasks: [],
    gamification: {
      xp: 0,
      level: 1,
      xpPerCompletion: 10,
      xpPerLevel: 100
    }
  })
})

module.exports = router
