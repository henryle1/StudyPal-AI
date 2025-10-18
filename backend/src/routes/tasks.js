const express = require('express')

const router = express.Router()

// TODO: plug in database + auth middleware once ready.
router.get('/', (_req, res) => {
  res.json({
    tasks: [
      {
        id: 'placeholder-task',
        title: 'Sketch database schema',
        status: 'pending',
        dueDate: null
      }
    ]
  })
})

router.post('/', (_req, res) => {
  res.status(201).json({ message: 'Task creation placeholder' })
})

router.put('/:taskId', (_req, res) => {
  res.json({ message: 'Task update placeholder' })
})

router.delete('/:taskId', (_req, res) => {
  res.status(204).send()
})

module.exports = router
