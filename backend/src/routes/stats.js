const express = require('express')

const { query } = require('../db')

const XP_PER_COMPLETION = 60
const XP_PER_LEVEL = 600

const router = express.Router()

router.get('/overview', async (_req, res) => {
  try {
    const today = startOfDay(new Date())
    const tasks = await fetchTasksWithCompletion()

    const weeklyProgress = buildWeeklyProgress(tasks, today)
    const totals = calculateTotals(tasks, today)
    const streak = calculateStreaks(weeklyProgress)
    const upcomingTasks = getUpcomingTasks(tasks, today)
    const gamification = buildGamification(totals.completedTasks, streak, weeklyProgress)

    const weeklySummary = weeklyProgress.reduce(
      (acc, day) => {
        acc.completed += day.completed
        acc.planned += day.planned
        acc.studyMinutes += day.studyMinutes
        return acc
      },
      { completed: 0, planned: 0, studyMinutes: 0 }
    )

    const completionRate = computePercentage(totals.completedTasks, totals.totalTasks)
    const weeklyCompletionRate = computePercentage(weeklySummary.completed, weeklySummary.planned)

    res.json({
      totals,
      completionRate,
      weeklyCompletionRate,
      weeklyFocusMinutes: weeklySummary.studyMinutes,
      weeklyProgress,
      streakDays: streak.current,
      streak,
      upcomingTasks,
      gamification
    })
  } catch (error) {
    console.error('Failed to build stats overview', error)
    res.status(500).json({ error: 'Unable to load stats overview' })
  }
})

async function fetchTasksWithCompletion() {
  const sql = `
    select
      t.id,
      t.title,
      t.description,
      t.priority,
      t.status,
      t.due_date,
      t.estimated_hours,
      t.updated_at,
      latest_completion.completed_at
    from tasks t
    left join lateral (
      select th.changed_at as completed_at
      from task_history th
      where th.task_id = t.id
        and th.new_status = 'completed'
      order by th.changed_at desc
      limit 1
    ) as latest_completion on true
  `

  const { rows } = await query(sql)

  return rows.map((row) => {
    const estimatedHours =
      typeof row.estimated_hours === 'number'
        ? row.estimated_hours
        : row.estimated_hours != null
          ? Number(row.estimated_hours)
          : 0

    const completedAt =
      row.completed_at ??
      (row.status === 'completed' && row.updated_at ? row.updated_at : null)

    return {
      id: row.id,
      title: row.title,
      course: row.description ?? null,
      priority: row.priority,
      status: row.status,
      dueDate: row.due_date ? new Date(row.due_date).toISOString() : null,
      estimatedHours,
      completedAt: completedAt ? new Date(completedAt).toISOString() : null
    }
  })
}

function buildWeeklyProgress(tasks, today) {
  const days = []
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = addDays(today, -offset)
    const label = day.toLocaleDateString('en-US', { weekday: 'short' })
    const completed = tasks.filter((task) => isSameDay(task.completedAt, day)).length
    const planned = tasks.filter((task) => isSameDay(task.dueDate, day)).length
    const studyMinutes = tasks
      .filter((task) => isSameDay(task.completedAt, day))
      .reduce((total, task) => total + Math.round((task.estimatedHours ?? 0) * 60), 0)

    days.push({
      date: day.toISOString(),
      label,
      completed,
      planned,
      studyMinutes
    })
  }
  return days
}

function calculateTotals(tasks, today) {
  const completedTasks = tasks.filter((task) => task.status === 'completed')
  const pendingTasks = tasks.filter((task) => task.status !== 'completed')

  const overdueTasks = pendingTasks.filter(
    (task) => task.dueDate && new Date(task.dueDate) < today
  )
  const focusHours = tasks.reduce((total, task) => total + (task.estimatedHours ?? 0), 0)

  return {
    totalTasks: tasks.length,
    completedTasks: completedTasks.length,
    pendingTasks: pendingTasks.length,
    overdueTasks: overdueTasks.length,
    focusHours: Number(focusHours.toFixed(1))
  }
}

function calculateStreaks(weeklyProgress) {
  let current = 0
  let longest = 0
  let streak = 0
  let lastMissedDay = null

  weeklyProgress.forEach((day) => {
    if (day.completed > 0) {
      streak += 1
    } else {
      lastMissedDay = day.date
      longest = Math.max(longest, streak)
      streak = 0
    }
  })

  longest = Math.max(longest, streak)

  for (let i = weeklyProgress.length - 1; i >= 0; i -= 1) {
    if (weeklyProgress[i].completed > 0) {
      current += 1
    } else {
      break
    }
  }

  return {
    current,
    longest,
    lastMissedDay
  }
}

function getUpcomingTasks(tasks, today, limit = 4) {
  return tasks
    .filter((task) => task.status !== 'completed' && task.dueDate)
    .sort((a, b) => taskTimestamp(a.dueDate) - taskTimestamp(b.dueDate))
    .slice(0, limit)
    .map((task) => ({
      id: task.id,
      title: task.title,
      course: task.course,
      dueDate: task.dueDate,
      priority: task.priority,
      status: task.status,
      estimatedHours: task.estimatedHours,
      overdue: task.dueDate ? new Date(task.dueDate) < today : false
    }))
}

function buildGamification(totalCompleted, streak, weeklyProgress) {
  const xp = totalCompleted * XP_PER_COMPLETION
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const xpIntoLevel = xp % XP_PER_LEVEL
  const progressPercent = Math.round((xpIntoLevel / XP_PER_LEVEL) * 100)
  const xpToNextLevel = XP_PER_LEVEL - xpIntoLevel || XP_PER_LEVEL

  const weeklyCompleted = weeklyProgress.reduce((sum, day) => sum + day.completed, 0)
  const achievements = []

  if (streak.current >= 3) {
    achievements.push(`🔥 ${streak.current}-day streak`)
  }
  if (weeklyCompleted >= 5) {
    achievements.push('✅ Closed 5+ tasks this week')
  }
  if (totalCompleted >= 15) {
    achievements.push('🏅 Completed 15 tasks overall')
  }

  if (achievements.length === 0) {
    achievements.push('Keep the momentum going!')
  }

  return {
    xp,
    level,
    xpPerCompletion: XP_PER_COMPLETION,
    xpPerLevel: XP_PER_LEVEL,
    xpIntoLevel,
    xpToNextLevel,
    progressPercent,
    achievements
  }
}

function computePercentage(value, total) {
  if (!total) return 0
  return Number(((value / total) * 100).toFixed(1))
}

function startOfDay(date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function isSameDay(dateInput, dayStart) {
  if (!dateInput) return false
  const date = new Date(dateInput)
  return (
    date.getFullYear() === dayStart.getFullYear() &&
    date.getMonth() === dayStart.getMonth() &&
    date.getDate() === dayStart.getDate()
  )
}

function taskTimestamp(dateInput) {
  return dateInput ? new Date(dateInput).getTime() : Number.POSITIVE_INFINITY
}

module.exports = router
