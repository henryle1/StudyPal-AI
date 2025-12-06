const express = require('express')
const crypto = require('crypto')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const db = require('../db')

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const RESET_TOKEN_EXPIRY_MS = 1000 * 60 * 60 // 1 hour
const SALT_ROUNDS = 10

// Generate JWT token
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

function normalizeEmail(email) {
  if (typeof email !== 'string') return ''
  return email.trim().toLowerCase()
}

function generateResetToken() {
  return crypto.randomBytes(32).toString('hex')
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    const normalizedEmail = normalizeEmail(email)

    // Validate input
    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    )

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    // Create user
    const result = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, role, created_at',
      [name, normalizedEmail, passwordHash]
    )

    const user = result.rows[0]

    // Generate token
    const token = generateToken(user)

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'Failed to register user' })
  }
})

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const normalizedEmail = normalizeEmail(email)

    // Validate input
    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Find user
    const result = await db.query(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
      [normalizedEmail]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const user = result.rows[0]

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Generate token
    const token = generateToken(user)

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Failed to login' })
  }
})

// Start password reset flow
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    const normalizedEmail = normalizeEmail(email)

    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const userResult = await db.query('SELECT id FROM users WHERE email = $1', [normalizedEmail])

    // Always return a generic message to avoid account enumeration
    const responsePayload = {
      message: 'If an account exists for that email, we sent a reset link.'
    }

    if (userResult.rows.length === 0) {
      return res.json(responsePayload)
    }

    const user = userResult.rows[0]
    const token = generateResetToken()
    const tokenHash = hashResetToken(token)
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS)

    await db.query('UPDATE password_resets SET used = true WHERE user_id = $1 AND used = false', [user.id])
    await db.query(
      'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt]
    )

    // Provide raw token in non-production environments so developers can test without email
    if (process.env.NODE_ENV !== 'production') {
      responsePayload.resetToken = token
    }

    return res.json(responsePayload)
  } catch (error) {
    console.error('Forgot password error:', error)
    res.status(500).json({ error: 'Unable to start password reset' })
  }
})

// Complete password reset
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res.status(400).json({ error: 'Reset token and new password are required' })
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const tokenHash = hashResetToken(token)
    const resetResult = await db.query(
      'SELECT id, user_id, expires_at, used FROM password_resets WHERE token_hash = $1',
      [tokenHash]
    )

    if (resetResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' })
    }

    const resetRequest = resetResult.rows[0]

    if (resetRequest.used) {
      return res.status(400).json({ error: 'Reset token has already been used' })
    }

    if (new Date(resetRequest.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' })
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, resetRequest.user_id])
    await db.query('UPDATE password_resets SET used = true, used_at = now() WHERE id = $1', [resetRequest.id])
    await db.query('UPDATE password_resets SET used = true WHERE user_id = $1 AND used = false', [resetRequest.user_id])

    res.json({ message: 'Password has been reset successfully' })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

module.exports = router
