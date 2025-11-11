const express = require('express')
const db = require('../db')
const authPlaceholder = require('../middleware/auth')

const router = express.Router()

const DEFAULT_USER_ID = 1
const VALID_PRIORITIES = new Set(['low', 'medium', 'high'])
const VALID_STATUSES = new Set(['pending', 'in_progress', 'completed'])

function sanitizePriority(priority) {
  if (!priority) return 'medium'
  const normalized = String(priority).toLowerCase()
  return VALID_PRIORITIES.has(normalized) ? normalized : 'medium'
}

function sanitizeStatus(status) {
  if (!status) return 'pending'
  let normalized = String(status).toLowerCase()
  if (normalized === 'complete') {
    normalized = 'completed'
  }
  if (normalized === 'in-progress') {
    normalized = 'in_progress'
  }
  return VALID_STATUSES.has(normalized) ? normalized : 'pending'
}

router.get('/', authPlaceholder, async (req, res, next) => {
  try {
    const { status, priority, search, sort = 'due_date' } = req.query
    const filters = ['user_id = $1']
    const params = [DEFAULT_USER_ID]

    if (status && VALID_STATUSES.has(status)) {
      filters.push(`status = $${params.length + 1}`)
      params.push(status)
    }

    if (priority && VALID_PRIORITIES.has(priority)) {
      filters.push(`priority = $${params.length + 1}`)
      params.push(priority)
    }

    if (search) {
      filters.push(`(lower(title) like $${params.length + 1} or lower(description) like $${params.length + 1})`)
      params.push(`%${search.toLowerCase()}%`)
    }

    let orderByClause
    switch (sort) {
      case 'priority':
        orderByClause = 'priority desc, due_date asc nulls last'
        break
      case 'status':
        orderByClause = `case status
            when 'completed' then 3
            when 'in_progress' then 2
            else 1
          end desc, due_date asc nulls last`
        break
      case 'created_at':
        orderByClause = 'created_at desc'
        break
      case 'due_date':
      default:
        orderByClause = 'due_date asc nulls last, created_at asc'
        break
    }

    const sql = `select * from tasks where ${filters.join(' and ')} order by ${orderByClause}`
    const { rows } = await db.query(sql, params)
    res.json({ tasks: rows })
  } catch (err) {
    next(err)
  }
})

router.post('/', authPlaceholder, async (req, res, next) => {
  try {
    const {
      title,
      description = null,
      priority,
      status,
      due_date: dueDate,
      estimated_hours: estimatedHours
    } = req.body ?? {}

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' })
    }

    const normalizedPriority = sanitizePriority(priority)
    const normalizedStatus = sanitizeStatus(status)

    let dueDateValue = null
    if (dueDate) {
      const parsed = new Date(dueDate)
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'Invalid due date' })
      }
      dueDateValue = parsed
    }

    let estimatedHoursValue = null
    if (estimatedHours !== undefined && estimatedHours !== null && estimatedHours !== '') {
      const parsedHours = Number(estimatedHours)
      if (Number.isNaN(parsedHours)) {
        return res.status(400).json({ error: 'Estimated hours must be numeric' })
      }
      estimatedHoursValue = parsedHours
    }

    const {
      rows: [task]
    } = await db.query(
      `insert into tasks (user_id, title, description, priority, status, due_date, estimated_hours)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [DEFAULT_USER_ID, title.trim(), description, normalizedPriority, normalizedStatus, dueDateValue, estimatedHoursValue]
    )

    res.status(201).json({ task })
  } catch (err) {
    next(err)
  }
})

router.put('/:taskId', authPlaceholder, async (req, res, next) => {
  try {
    const { taskId } = req.params
    const {
      title,
      description,
      priority,
      status,
      due_date: dueDate,
      estimated_hours: estimatedHours
    } = req.body ?? {}

    const {
      rows: [existingTask]
    } = await db.query('select * from tasks where id = $1 and user_id = $2', [taskId, DEFAULT_USER_ID])

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' })
    }

    const updates = []
    const values = []

    if (title !== undefined) {
      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Title is required' })
      }
      updates.push(`title = $${values.length + 1}`)
      values.push(title.trim())
    }

    if (description !== undefined) {
      updates.push(`description = $${values.length + 1}`)
      values.push(description)
    }

    if (priority !== undefined) {
      updates.push(`priority = $${values.length + 1}`)
      values.push(sanitizePriority(priority))
    }

    if (status !== undefined) {
      updates.push(`status = $${values.length + 1}`)
      values.push(sanitizeStatus(status))
    }

    if (dueDate !== undefined) {
      if (dueDate === null || dueDate === '') {
        updates.push(`due_date = null`)
      } else {
        const parsed = new Date(dueDate)
        if (Number.isNaN(parsed.getTime())) {
          return res.status(400).json({ error: 'Invalid due date' })
        }
        updates.push(`due_date = $${values.length + 1}`)
        values.push(parsed)
      }
    }

    if (estimatedHours !== undefined) {
      if (estimatedHours === null || estimatedHours === '') {
        updates.push('estimated_hours = null')
      } else {
        const parsedHours = Number(estimatedHours)
        if (Number.isNaN(parsedHours)) {
          return res.status(400).json({ error: 'Estimated hours must be numeric' })
        }
        updates.push(`estimated_hours = $${values.length + 1}`)
        values.push(parsedHours)
      }
    }

    if (updates.length === 0) {
      return res.json({ task: existingTask })
    }

    updates.push('updated_at = now()')
    const updateSql = `update tasks set ${updates.join(', ')} where id = $${
      values.length + 1
    } and user_id = $${values.length + 2} returning *`
    const {
      rows: [updatedTask]
    } = await db.query(updateSql, [...values, taskId, DEFAULT_USER_ID])

    if (status !== undefined && sanitizeStatus(status) !== existingTask.status) {
      await db.query(
        `insert into task_history (task_id, previous_status, new_status)
         values ($1, $2, $3)`,
        [taskId, existingTask.status, updatedTask.status]
      )
    }

    res.json({ task: updatedTask })
  } catch (err) {
    next(err)
  }
})

router.delete('/:taskId', authPlaceholder, async (req, res, next) => {
  try {
    const { taskId } = req.params
    await db.query('delete from tasks where id = $1 and user_id = $2', [taskId, DEFAULT_USER_ID])
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

module.exports = router
