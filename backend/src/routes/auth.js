const express = require('express')

const router = express.Router()

// TODO: Replace with actual controller logic.
router.post('/register', (_req, res) => {
  res.json({ message: 'Register endpoint placeholder' })
})

router.post('/login', (_req, res) => {
  res.json({
    message: 'Login endpoint placeholder',
    token: 'replace-with-jwt',
    user: { id: 'user-id', name: 'Demo User' }
  })
})

module.exports = router
