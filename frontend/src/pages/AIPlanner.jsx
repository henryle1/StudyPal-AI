import { useCallback, useEffect, useMemo, useState } from 'react'

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
const HISTORY_STORAGE_KEY = 'studypal_ai_history'

const DEFAULT_PREFERENCES = {
  studyHours: 12,
  focusAreas: [FOCUS_OPTIONS[0].id, FOCUS_OPTIONS[1].id],
  preferredWindows: ['early', 'afternoon'],
  targetGoal: 'Upcoming exam or project milestone',
  notes: ''
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

function normalizeHistoryEntry(entry) {
  if (!entry) {
    return null
  }
  const id = entry.id ?? `server-${entry.savedAt ?? entry.created_at ?? Date.now()}`
  const savedAt = entry.savedAt ?? entry.created_at ?? new Date().toISOString()

  return {
    id,
    savedAt,
    plan: entry.plan ?? entry,
    preferences: entry.preferences ?? null,
    source: 'server'
  }
}

function AIPlanner() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES)
  const [plan, setPlan] = useState(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [notice, setNotice] = useState(null)

  const focusBadges = useMemo(() => {
    return preferences.focusAreas.map((id) => FOCUS_LOOKUP[id]?.label ?? id)
  }, [preferences.focusAreas])

  const planStats = useMemo(() => {
    if (!plan) {
      return { weeklyHours: 0, days: 0, totalBlocks: 0, avgBlockLength: 0 }
    }
    const schedule = Array.isArray(plan.dailySchedule) ? plan.dailySchedule : []
    const weeklyHours = schedule.reduce((sum, day) => sum + (Number(day.totalHours) || 0), 0)
    const totalBlocks = schedule.reduce(
      (sum, day) => sum + (Array.isArray(day.blocks) ? day.blocks.length : 0),
      0
    )
    const avgBlockLength = totalBlocks ? Math.round((weeklyHours / totalBlocks) * 10) / 10 : 0
    return {
      weeklyHours,
      days: schedule.length,
      totalBlocks,
      avgBlockLength
    }
  }, [plan])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const stored = window.localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!stored) {
      return
    }
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) {
        setHistory(parsed)
      }
    } catch {
      // ignore invalid payloads
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
  }, [history])

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/ai/history')
        if (!res.ok) {
          throw new Error('Failed to fetch history')
        }
        const data = await res.json()
        const serverHistory = Array.isArray(data.history)
          ? data.history
              .map((entry) => normalizeHistoryEntry(entry))
              .filter(Boolean)
          : []
        if (serverHistory.length) {
          setHistory((prev) => {
            const existingIds = new Set(prev.map((item) => item.id))
            const merged = [...serverHistory.filter((item) => !existingIds.has(item.id)), ...prev]
            return merged.slice(0, 10)
          })
        }
      } catch {
        // silently ignore - offline history still works.
      } finally {
        setHistoryLoading(false)
      }
    }
    fetchHistory()
  }, [])

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
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        throw new Error('Failed to generate plan')
      }

      const data = await res.json()
      const normalizedPlan = normalizePlan(data, preferences)
      setPlan(normalizedPlan)
      setNotice('Plan generated with StudyPal AI.')
    } catch (error) {
      const fallbackPlan = buildFallbackPlan(preferences)
      setPlan(fallbackPlan)
      setPlanError(error.message ?? 'Unable to reach the AI planner. Showing fallback plan.')
    } finally {
      setPlanLoading(false)
    }
  }

  const savePlanToHistory = () => {
    if (!plan) {
      return
    }
    const uniqueId =
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}`
    const entry = {
      id: uniqueId,
      savedAt: new Date().toISOString(),
      plan,
      preferences
    }
    setHistory((prev) => [entry, ...prev].slice(0, 10))
    setNotice('Plan saved to history.')
  }

  const loadHistoryEntry = (entry) => {
    setPlan(entry.plan)
    if (entry.preferences) {
      setPreferences(entry.preferences)
    }
    setNotice(`Loaded plan from ${new Date(entry.savedAt).toLocaleDateString()}.`)
  }

  const copyPlanSummary = async () => {
    if (!plan) {
      return
    }

    const generatedAt = new Date(plan.metadata?.generatedAt ?? Date.now())
    const lines = [
      `StudyPal AI Plan — ${generatedAt.toLocaleString()}`,
      `Summary: ${plan.summary}`,
      `Weekly focus: ${planStats.weeklyHours}h across ${planStats.days} days`,
      `Blocks: ${planStats.totalBlocks} (avg ${planStats.avgBlockLength || 0}h)`,
      focusBadges.length ? `Focus areas: ${focusBadges.join(', ')}` : null,
      ''
    ].filter(Boolean)

    plan.dailySchedule.forEach((day) => {
      lines.push(`${day.day} · ${day.theme} (${day.totalHours}h)`)
      if (Array.isArray(day.blocks) && day.blocks.length > 0) {
        day.blocks.forEach((block) => {
          lines.push(
            `  - ${block.label}${block.window ? ` [${block.window}]` : ''}: ${block.activity} (${block.duration})`
          )
        })
      } else {
        lines.push('  - No scheduled blocks.')
      }
      lines.push('')
    })

    const clipboardText = lines.join('\n')

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(clipboardText)
        setNotice('Plan summary copied to clipboard.')
      } else {
        throw new Error('Clipboard unavailable')
      }
    } catch (_error) {
      setNotice('Clipboard unavailable. Select the summary text manually.')
    }
  }

  const clearPlan = () => {
    setPlan(null)
    setNotice(null)
  }

  return (
    <div className="ai-grid">
      <section className="ai-card">
        <header className="ai-card-header">
          <div>
            <p className="ai-eyebrow">Plan preferences</p>
            <h3>Tell StudyPal what to prioritize</h3>
            <p className="ai-subtitle">
              Share the hours you can commit, the skills that need attention, and the time windows
              that actually work.
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
            <span>Notes for the AI planner</span>
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
            <p className="ai-eyebrow">Generated study plan</p>
            <h3>Stay accountable all week</h3>
            <p className="ai-subtitle">
              StudyPal summarizes the focus, outlines daily blocks, and keeps helpful reminders in
              one place.
            </p>
          </div>
          <div className="plan-actions">
            <button type="button" className="ghost-btn" onClick={savePlanToHistory} disabled={!plan}>
              Save to history
            </button>
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
                <section className="plan-hero">
                  <div>
                    <p className="summary-label">Weekly intent</p>
                    <h4>{plan.summary}</h4>
                    <p className="plan-provider">
                      {new Date(plan.metadata?.generatedAt ?? Date.now()).toLocaleString()} ·{' '}
                      {plan.metadata?.provider ?? 'StudyPal AI'}
                    </p>
                  </div>
                  <div className="plan-hero-actions">
                    <button type="button" onClick={copyPlanSummary}>
                      Copy summary
                    </button>
                  </div>
                </section>

                <ul className="plan-stat-grid">
                  <li>
                    <p>Weekly focus</p>
                    <strong>{planStats.weeklyHours}h</strong>
                    <small>Estimated study time</small>
                  </li>
                  <li>
                    <p>Active days</p>
                    <strong>{planStats.days}</strong>
                    <small>Planned work sessions</small>
                  </li>
                  <li>
                    <p>Blocks</p>
                    <strong>{planStats.totalBlocks}</strong>
                    <small>
                      Avg {planStats.avgBlockLength ? `${planStats.avgBlockLength}h` : '—'} per block
                    </small>
                  </li>
                  <li>
                    <p>Focus areas</p>
                    <strong>{focusBadges.length || '—'}</strong>
                    <small>What you’re prioritizing</small>
                  </li>
                </ul>

                {focusBadges.length > 0 && (
                  <div className="plan-tags">
                    {focusBadges.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                )}

                <div className="plan-week-grid">
                  {plan.dailySchedule.map((day, index) => {
                    const blocks = Array.isArray(day.blocks) ? day.blocks : []
                    return (
                      <article key={`${day.day}-${index}`} className="day-card">
                        <header className="day-card-header">
                          <div>
                            <p className="day-name">{day.day}</p>
                            <p className="day-theme">{day.theme}</p>
                          </div>
                          <span className="day-hours">{day.totalHours}h</span>
                        </header>
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
                      </article>
                    )
                  })}
                </div>

                <section className="plan-tips">
                  <p className="section-label">Guided reminders</p>
                  <h4>Keep the momentum</h4>
                  <ul>
                    {plan.tips.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                </section>
              </>
            )}
          </div>

          <aside className="plan-history">
            <div className="history-header">
              <p className="section-label">Plan history</p>
              {historyLoading && <small>Loading…</small>}
            </div>
            {history.length === 0 && (
              <p className="history-empty">No saved plans yet. Generate one and tap “Save”.</p>
            )}
            <ul>
              {history.map((entry) => (
                <li key={entry.id}>
                  <div>
                    <strong>{new Date(entry.savedAt).toLocaleDateString()}</strong>
                    {entry.preferences?.targetGoal && <small>{entry.preferences.targetGoal}</small>}
                  </div>
                  <div className="history-tags">
                    {(entry.preferences?.focusAreas ?? []).slice(0, 2).map((focusId) => (
                      <span key={`${entry.id}-${focusId}`}>
                        {FOCUS_LOOKUP[focusId]?.label ?? focusId}
                      </span>
                    ))}
                  </div>
                  <button type="button" onClick={() => loadHistoryEntry(entry)}>
                    Reuse plan
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>
    </div>
  )
}

export default AIPlanner
