const jwt = require('jsonwebtoken')
const db = require('../db')

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key'

/**
 * Authentication middleware that validates JWT tokens
 * Extracts token from Authorization header and verifies it
 * Attaches user information to req.user if valid
 */
async function authenticate(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization

    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header provided' })
    }

    // Check if it's a Bearer token
    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'Invalid authorization header format. Expected: Bearer <token>' })
    }

    const token = parts[1]

    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    // Verify and decode the token
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token has expired' })
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' })
      }
      throw error
    }

    // Optionally verify user still exists in database
    // This ensures tokens are invalidated if user is deleted
    const result = await db.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [decoded.id]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' })
    }

    // Attach user information to request object
    req.user = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      email: result.rows[0].email,
      role: result.rows[0].role
    }

    // Continue to next middleware/route handler
    next()
  } catch (error) {
    console.error('Authentication error:', error)
    res.status(500).json({ error: 'Authentication failed' })
  }
}

module.exports = authenticate
