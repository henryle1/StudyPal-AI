import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiCall } from '../utils/api.js'

const FOCUS_OPTIONS = [
  { id: 'concepts', label: 'Concept review', description: 'Strengthen fundamentals & theory.' },
  { id: 'practice', label: 'Practice problems', description: 'Solve exam-style questions.' },
  { id: 'projects', label: 'Projects & labs', description: 'Ship progress on long-form work.' },
  { id: 'reading', label: 'Reading & notes', description: 'Digest chapters, papers, or slides.' },
  { id: 'retention', label: 'Recall drills', description: 'Flashcards, spaced repetition, quizzes.' }
]

const TIME_WINDOWS = [
  { id: 'early', label: 'Early morning', range: '6 – 9a' },
  { id: 'midday', label: 'Late morning', range: '9 – 12p' },
  { id: 'afternoon', label: 'Afternoon', range: '1 – 5p' },
  { id: 'evening', label: 'Evening', range: '6 – 9p' },
  { id: 'late', label: 'Late night', range: '9 – 11p' }
]

const FOCUS_LOOKUP = FOCUS_OPTIONS.reduce((acc, option) => {
  acc[option.id] = option
  return acc
}, {})

const WINDOW_LOOKUP = TIME_WINDOWS.reduce((acc, option) => {
  acc[option.id] = option
  return acc
}, {})

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const DEFAULT_PREFERENCES = {
  studyHours: 12,
  focusAreas: [FOCUS_OPTIONS[0].id, FOCUS_OPTIONS[1].id],
  preferredWindows: ['early', 'afternoon'],
  targetGoal: 'Upcoming exam or project milestone',
  notes: ''
}

const PLAN_STORAGE_KEY = 'studypal_ai_plan'
const PREFS_STORAGE_KEY = 'studypal_ai_preferences'

function loadFromStorage(key, fallback = null) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function buildFallbackPlan(preferences) {
  const hours = Number(preferences.studyHours) || DEFAULT_PREFERENCES.studyHours
  const focusList = preferences.focusAreas?.length ? preferences.focusAreas : DEFAULT_PREFERENCES.focusAreas
  const windowList = preferences.preferredWindows?.length
    ? preferences.preferredWindows
    : DEFAULT_PREFERENCES.preferredWindows
  const sessionsPerDay = Math.max(1, Math.min(2, windowList.length))
  const hoursPerSession = Math.max(1, Math.round(hours / (sessionsPerDay * 5)))

  const schedule = WEEK_DAYS.slice(0, 5).map((day, index) => {
    const focusId = focusList[index % focusList.length]
    const windowId = windowList[index % windowList.length]
    const focusMeta = FOCUS_LOOKUP[focusId] ?? FOCUS_OPTIONS[0]
    const windowMeta = WINDOW_LOOKUP[windowId] ?? TIME_WINDOWS[0]

    return {
      day,
      theme: focusMeta.label,
      focus: focusMeta.description,
      blocks: [
        {
          label: windowMeta.label,
          activity: `Target ${focusMeta.label.toLowerCase()} with a deep work block.`,
          duration: `${hoursPerSession}h`,
          window: windowMeta.range
        }
      ],
      totalHours: hoursPerSession
    }
  })

  const readableWindows = windowList.map((id) => WINDOW_LOOKUP[id]?.label ?? id).join(', ')
  const readableFocus = focusList.map((id) => FOCUS_LOOKUP[id]?.label ?? id).join(', ')

  const tips = [
    `Reserve ${readableWindows} for distraction-free focus.`,
    `Rotate between ${readableFocus} to cover all priority areas without burnout.`,
    preferences.targetGoal
      ? `Close each session by writing one insight that keeps ${preferences.targetGoal} on track.`
      : 'Log a quick reflection after each block to reinforce what you learned.'
  ]

  return {
    summary: preferences.targetGoal
      ? `Balanced plan to stay on track for ${preferences.targetGoal}.`
      : 'Structured focus blocks to maintain consistent study momentum.',
    dailySchedule: schedule,
    tips,
    metadata: {
      generatedAt: new Date().toISOString(),
      provider: 'StudyPal AI (offline)',
      fallback: true
    }
  }
}

function normalizePlan(apiResponse, preferences) {
  const fallback = buildFallbackPlan(preferences)
  const planFromApi = apiResponse?.plan ?? apiResponse ?? {}

  const schedule =
    Array.isArray(planFromApi.dailySchedule) && planFromApi.dailySchedule.length > 0
      ? planFromApi.dailySchedule.map((day, index) => {
          const fallbackDay = fallback.dailySchedule[index] ?? fallback.dailySchedule[0]
          const blocks =
            Array.isArray(day.blocks) && day.blocks.length > 0
              ? day.blocks
              : Array.isArray(day.sessions)
                ? day.sessions.map((session) => ({
                    label: session.label ?? session.window ?? 'Focus block',
                    activity: session.activity ?? session.summary ?? 'Deep work session',
                    duration: session.duration ?? session.length ?? '1h',
                    window: session.window ?? ''
                  }))
                : fallbackDay.blocks

          return {
            day: day.day ?? day.title ?? fallbackDay.day,
            theme: day.theme ?? day.focus ?? fallbackDay.theme,
            focus: day.focus ?? day.theme ?? fallbackDay.focus,
            blocks,
            totalHours: day.totalHours ?? day.hours ?? fallbackDay.totalHours
          }
        })
      : fallback.dailySchedule

  return {
    summary: planFromApi.summary ?? planFromApi.planSummary ?? fallback.summary,
    dailySchedule: schedule,
    tips:
      Array.isArray(planFromApi.tips) && planFromApi.tips.length > 0
        ? planFromApi.tips
        : fallback.tips,
    metadata: {
      generatedAt: new Date().toISOString(),
      provider: apiResponse?.provider ?? 'StudyPal AI',
      fromApi: true
    }
  }
}

function AIPlanner() {
  const [preferences, setPreferences] = useState(() => loadFromStorage(PREFS_STORAGE_KEY, DEFAULT_PREFERENCES))
  const [plan, setPlan] = useState(() => loadFromStorage(PLAN_STORAGE_KEY, null))
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState(null)
  const [notice, setNotice] = useState(null)

  const planStats = useMemo(() => {
    if (!plan) {
      return { weeklyHours: 0, days: 0 }
    }
    const schedule = Array.isArray(plan.dailySchedule) ? plan.dailySchedule : []
    const weeklyHours = schedule.reduce((sum, day) => sum + (Number(day.totalHours) || 0), 0)
    return {
      weeklyHours,
      days: schedule.length
    }
  }, [plan])

  const togglePreferenceList = useCallback((key, value) => {
    setPreferences((prev) => {
      const current = new Set(prev[key])
      if (current.has(value)) {
        current.delete(value)
      } else {
        current.add(value)
      }
      return { ...prev, [key]: Array.from(current) }
    })
  }, [])

  const updatePreference = useCallback((key, value) => {
    setPreferences((prev) => ({ ...prev, [key]: value }))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(preferences))
  }, [preferences])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (plan) {
      localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plan))
    } else {
      localStorage.removeItem(PLAN_STORAGE_KEY)
    }
  }, [plan])

  const validatePreferences = () => {
    if (!preferences.focusAreas.length) {
      return 'Select at least one focus area.'
    }
    if (!preferences.preferredWindows.length) {
      return 'Select at least one preferred time window.'
    }
    if (!preferences.studyHours || preferences.studyHours < 2) {
      return 'Aim for at least 2 study hours per week.'
    }
    return null
  }

  const generatePlan = async (event) => {
    event.preventDefault()
    const validationError = validatePreferences()
    if (validationError) {
      setPlanError(validationError)
      return
    }

    setPlanLoading(true)
    setPlanError(null)
    setNotice(null)

    const payload = {
      studyHours: preferences.studyHours,
      focusAreas: preferences.focusAreas,
      preferredWindows: preferences.preferredWindows,
      targetGoal: preferences.targetGoal,
      notes: preferences.notes
    }

    try {
      const data = await apiCall('/api/ai/plan', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      const normalizedPlan = normalizePlan(data, preferences)
      setPlan(normalizedPlan)
      setNotice('Plan generated successfully.')
    } catch (error) {
      const fallbackPlan = buildFallbackPlan(preferences)
      setPlan(fallbackPlan)
      setPlanError(error.message ?? 'Unable to generate plan. Showing default schedule.')
    } finally {
      setPlanLoading(false)
    }
  }

  const clearPlan = () => {
    setPlan(null)
    setNotice(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(PLAN_STORAGE_KEY)
    }
  }

  return (
    <div className="ai-grid">
      <section className="ai-card">
        <header className="ai-card-header">
          <div>
            <p className="ai-eyebrow">Plan preferences</p>
            <h3>Set your study priorities</h3>
            <p className="ai-subtitle">
              Configure your available hours, focus areas, and preferred time windows to generate a personalized study schedule.
            </p>
          </div>
          <div className="hours-badge">{preferences.studyHours}h / week</div>
        </header>

        <form className="plan-form" onSubmit={generatePlan}>
          <label className="form-field">
            <span>Weekly study hours</span>
            <div className="range-row">
              <input
                type="range"
                min="4"
                max="40"
                step="2"
                value={preferences.studyHours}
                onChange={(event) => updatePreference('studyHours', Number(event.target.value))}
              />
              <span>{preferences.studyHours} hours</span>
            </div>
          </label>

          <div className="form-field">
            <span>Focus areas</span>
            <div className="chip-grid">
              {FOCUS_OPTIONS.map((option) => {
                const isSelected = preferences.focusAreas.includes(option.id)
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`chip ${isSelected ? 'selected' : ''}`}
                    onClick={() => togglePreferenceList('focusAreas', option.id)}
                  >
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="form-field">
            <span>Preferred time windows</span>
            <div className="chip-grid">
              {TIME_WINDOWS.map((option) => {
                const isSelected = preferences.preferredWindows.includes(option.id)
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`chip ${isSelected ? 'selected' : ''}`}
                    onClick={() => togglePreferenceList('preferredWindows', option.id)}
                  >
                    <strong>{option.label}</strong>
                    <small>{option.range}</small>
                  </button>
                )
              })}
            </div>
          </div>

          <label className="form-field">
            <span>What are you working toward?</span>
            <input
              type="text"
              value={preferences.targetGoal}
              placeholder="E.g. CS409 midterm on March 12"
              onChange={(event) => updatePreference('targetGoal', event.target.value)}
            />
          </label>

          <label className="form-field">
            <span>Additional notes</span>
            <textarea
              rows="3"
              value={preferences.notes}
              placeholder="Mention tricky courses, deadlines, or energy peaks."
              onChange={(event) => updatePreference('notes', event.target.value)}
            />
          </label>

          {planError && !planLoading && (
            <p className="form-error" role="alert">
              {planError}
            </p>
          )}

          <div className="form-actions">
            <button type="submit" className="primary-btn" disabled={planLoading}>
              {planLoading ? 'Generating...' : 'Generate study plan'}
            </button>
            <button type="button" className="ghost-btn" onClick={clearPlan}>
              Clear plan
            </button>
          </div>
        </form>
      </section>

      <section className="ai-card">
        <header className="ai-card-header">
          <div>
            <h3>Your study plan</h3>
          </div>
        </header>

        {notice && (
          <div className="plan-notice" role="status">
            {notice}
          </div>
        )}

        <div className="plan-output">
          <div className="plan-main">
            {planLoading && (
              <div className="plan-placeholder">
                <span className="focus-spinner" aria-hidden="true" />
                <p>Crafting your personalized study plan…</p>
              </div>
            )}

            {!planLoading && !plan && (
              <div className="plan-placeholder">
                <p>No plan generated yet.</p>
                <p>Use the form on the left to create a fresh schedule.</p>
              </div>
            )}

            {!planLoading && plan && (
              <>
                <div className="plan-summary">
                  <p>{plan.summary}</p>
                  <p>{planStats.weeklyHours}h per week · {planStats.days} days</p>
                </div>

                <ul className="plan-list">
                  {plan.dailySchedule.map((day, index) => {
                    const blocks = Array.isArray(day.blocks) ? day.blocks : []
                    return (
                      <li key={`${day.day}-${index}`} className="plan-list-item">
                        <div className="plan-list-head">
                          <div className="plan-list-day">
                            <span className="plan-day-index">Day {index + 1}</span>
                            <div>
                              <p className="day-name">{day.day}</p>
                              <p className="day-theme">{day.theme}</p>
                            </div>
                          </div>
                          <span className="day-hours">{day.totalHours}h</span>
                        </div>
                        <p className="day-focus">{day.focus}</p>
                        <ul className="block-list">
                          {blocks.length === 0 ? (
                            <li className="block-empty">No scheduled blocks yet. Add one to stay on track.</li>
                          ) : (
                            blocks.map((block, blockIndex) => (
                              <li key={`${day.day}-${blockIndex}`}>
                                <div>
                                  <strong>{block.label}</strong>
                                  <small>{block.window || 'Flexible window'}</small>
                                </div>
                                <p>{block.activity}</p>
                                <span>{block.duration}</span>
                              </li>
                            ))
                          )}
                        </ul>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default AIPlanner
