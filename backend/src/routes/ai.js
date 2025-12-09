const express = require('express')

const db = require('../db')
const authenticate = require('../middleware/auth')

const router = express.Router()

const DEFAULT_PREFERENCES = {
  studyHours: 12,
  focusAreas: ['concepts', 'practice'],
  preferredWindows: ['early', 'afternoon'],
  targetGoal: '',
  notes: ''
}

const FOCUS_LOOKUP = {
  concepts: { label: 'Concept review', description: 'Strengthen fundamentals & theory.' },
  practice: { label: 'Practice problems', description: 'Solve exam-style questions.' },
  projects: { label: 'Projects & labs', description: 'Ship progress on long-form work.' },
  reading: { label: 'Reading & notes', description: 'Digest chapters, papers, or slides.' },
  retention: { label: 'Recall drills', description: 'Flashcards, spaced repetition, quizzes.' }
}

const WINDOW_LOOKUP = {
  early: { label: 'Early morning', range: '6-9a' },
  midday: { label: 'Late morning', range: '9-12p' },
  afternoon: { label: 'Afternoon', range: '1-5p' },
  evening: { label: 'Evening', range: '6-9p' },
  late: { label: 'Late night', range: '9-11p' }
}

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

let aiPlansReady = false
async function ensureAiPlansTable() {
  if (aiPlansReady) return
  await db.query(`
    create table if not exists ai_plans (
      id serial primary key,
      user_id integer not null references users (id) on delete cascade,
      prompt jsonb,
      response jsonb,
      created_at timestamptz default now()
    );
    create index if not exists idx_ai_plans_user_id on ai_plans (user_id);
  `)
  aiPlansReady = true
}

function normalizePreferences(input = {}) {
  const focusAreas = Array.isArray(input.focusAreas) ? input.focusAreas.filter(Boolean) : DEFAULT_PREFERENCES.focusAreas
  const preferredWindows = Array.isArray(input.preferredWindows)
    ? input.preferredWindows.filter(Boolean)
    : DEFAULT_PREFERENCES.preferredWindows

  return {
    studyHours: Number(input.studyHours) || DEFAULT_PREFERENCES.studyHours,
    focusAreas: focusAreas.length ? focusAreas : DEFAULT_PREFERENCES.focusAreas,
    preferredWindows: preferredWindows.length ? preferredWindows : DEFAULT_PREFERENCES.preferredWindows,
    targetGoal: input.targetGoal || DEFAULT_PREFERENCES.targetGoal,
    notes: input.notes || DEFAULT_PREFERENCES.notes
  }
}

function buildPlan(preferences) {
  const hours = Math.max(2, preferences.studyHours)
  const sessionsPerDay = Math.max(1, Math.min(2, preferences.preferredWindows.length || 1))
  const hoursPerSession = Math.max(1, Math.round(hours / (sessionsPerDay * WEEK_DAYS.length)))

  const schedule = WEEK_DAYS.map((day, index) => {
    const focusId = preferences.focusAreas[index % preferences.focusAreas.length]
    const windowId = preferences.preferredWindows[index % preferences.preferredWindows.length]
    const focus = FOCUS_LOOKUP[focusId] ?? FOCUS_LOOKUP.concepts
    const window = WINDOW_LOOKUP[windowId] ?? WINDOW_LOOKUP.afternoon

    return {
      day,
      theme: focus.label,
      focus: focus.description,
      blocks: [
        {
          label: window.label,
          activity: `Target ${focus.label.toLowerCase()} with a deep work block.`,
          duration: `${hoursPerSession}h`,
          window: window.range
        }
      ],
      totalHours: hoursPerSession
    }
  })

  const readableWindows = preferences.preferredWindows.map((id) => WINDOW_LOOKUP[id]?.label ?? id).join(', ')
  const readableFocus = preferences.focusAreas.map((id) => FOCUS_LOOKUP[id]?.label ?? id).join(', ')

  return {
    summary: preferences.targetGoal
      ? `Balanced plan to stay on track for ${preferences.targetGoal}.`
      : 'Structured focus blocks to maintain consistent study momentum.',
    dailySchedule: schedule,
    tips: [
      `Reserve ${readableWindows} for distraction-free focus.`,
      `Rotate between ${readableFocus} to cover all priority areas without burnout.`,
      preferences.targetGoal
        ? `Close each session by writing one insight that keeps ${preferences.targetGoal} on track.`
        : 'Log a quick reflection after each block to reinforce what you learned.'
    ],
    metadata: {
      generatedAt: new Date().toISOString(),
      provider: 'StudyPal AI (server)'
    }
  }
}

router.use(authenticate)

router.get('/plan', async (req, res, next) => {
  try {
    await ensureAiPlansTable()
    const {
      rows
    } = await db.query(
      'select id, response, created_at from ai_plans where user_id = $1 order by created_at desc limit 1',
      [req.user.id]
    )

    if (rows.length === 0) {
      return res.json({ plan: null })
    }

    const planPayload = rows[0].response
    const parsedPlan = typeof planPayload === 'string' ? JSON.parse(planPayload) : planPayload

    res.json({
      plan: parsedPlan,
      savedAt: rows[0].created_at,
      planId: rows[0].id
    })
  } catch (error) {
    next(error)
  }
})

router.post('/plan', async (req, res, next) => {
  try {
    await ensureAiPlansTable()
    const preferences = normalizePreferences(req.body ?? {})
    const plan = buildPlan(preferences)

    const {
      rows: [saved]
    } = await db.query(
      `insert into ai_plans (user_id, prompt, response)
       values ($1, $2::jsonb, $3::jsonb)
       returning id, created_at`,
      [req.user.id, JSON.stringify({ preferences }), JSON.stringify(plan)]
    )

    res.json({
      plan,
      savedAt: saved.created_at,
      planId: saved.id
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
