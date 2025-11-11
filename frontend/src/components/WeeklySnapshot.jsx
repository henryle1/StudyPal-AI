import { useEffect, useMemo, useState } from 'react'
import { API_URL } from '../config.js'

const STATS_ENDPOINT = `${API_URL}/api/stats/overview`

function WeeklySnapshot() {
  const [snapshot, setSnapshot] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadSnapshot() {
      setStatus('loading')
      setError(null)
      try {
        const response = await fetch(STATS_ENDPOINT, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`)
        }
        const payload = await response.json()
        setSnapshot(payload)
        setStatus('success')
      } catch (err) {
        if (err.name === 'AbortError') {
          return
        }
        setError(err.message || 'Unable to load stats')
        setStatus('error')
      }
    }

    loadSnapshot()

    return () => controller.abort()
  }, [refreshKey])

  const weeklySummary = useMemo(() => {
    if (!snapshot) return null
    const weekStart = snapshot.weeklyProgress?.[0]?.label
    const weekEnd = snapshot.weeklyProgress?.[snapshot.weeklyProgress.length - 1]?.label
    return {
      focusMinutes: snapshot.weeklyFocusMinutes ?? 0,
      taskProgress: `${snapshot.totals.completedTasks}/${snapshot.totals.totalTasks} tasks done`,
      window: weekStart && weekEnd ? `${weekStart} to ${weekEnd}` : null
    }
  }, [snapshot])

  const streakCard = snapshot
    ? {
        value: `${snapshot.streakDays} days`,
        subtitle: `Longest: ${snapshot.streak.longest} days`,
        context: snapshot.streak.lastMissedDay
          ? `Last miss: ${new Date(snapshot.streak.lastMissedDay).toLocaleDateString(undefined, {
              weekday: 'short'
            })}`
          : 'Perfect record this week'
      }
    : null
  const completionValue =
    snapshot && typeof snapshot.weeklyCompletionRate === 'number'
      ? `${snapshot.weeklyCompletionRate.toFixed(1)}%`
      : '--'
  const completionMeta = snapshot
    ? `${snapshot.totals.completedTasks}/${snapshot.totals.totalTasks} tasks closed`
    : ''

  const xp = snapshot?.gamification
  const xpValue = xp ? xp.xp.toLocaleString() : '--'
  const xpProgress = xp?.progressPercent ?? 0
  const xpMeta =
    xp && typeof xp.xpIntoLevel === 'number' && typeof xp.xpPerLevel === 'number'
      ? `${xp.xpIntoLevel} / ${xp.xpPerLevel} XP to next level`
      : ''
  const summaryDescription = weeklySummary
    ? `${weeklySummary.focusMinutes} focus minutes logged${
        weeklySummary.window ? ` | ${weeklySummary.window}` : ''
      }`
    : null

  return (
    <section className="snapshot-section">
      <header className="snapshot-header">
        <div>
          <p className="snapshot-eyebrow">Weekly Snapshot</p>
          <h2 className="snapshot-title">Momentum check-in</h2>
          {summaryDescription && <p className="snapshot-description">{summaryDescription}</p>}
        </div>
        {weeklySummary && <span className="snapshot-pill">{weeklySummary.taskProgress}</span>}
      </header>

      {status === 'loading' && <div className="snapshot-placeholder">Syncing analytics...</div>}

      {status === 'error' && (
        <div className="snapshot-error">
          <div>
            <strong>Couldn't load stats.</strong>
            <p>{error}</p>
          </div>
          <button type="button" onClick={() => setRefreshKey((prev) => prev + 1)}>
            Retry
          </button>
        </div>
      )}

      {status === 'success' && snapshot && (
        <>
          <div className="snapshot-grid">
            <article className="snapshot-card">
              <p className="snapshot-label">Completion rate</p>
              <p className="snapshot-value">{completionValue}</p>
              <p className="snapshot-subtext">{completionMeta}</p>
            </article>

            <article className="snapshot-card">
              <p className="snapshot-label">Streak</p>
              <p className="snapshot-value">{streakCard?.value}</p>
              <p className="snapshot-subtext">{streakCard?.subtitle}</p>
              <p className="snapshot-meta">{streakCard?.context}</p>
            </article>

            <article className="snapshot-card">
              <p className="snapshot-label">XP progress</p>
              <p className="snapshot-value">{xpValue} XP</p>
              <p className="snapshot-subtext">Level {xp?.level ?? '--'}</p>
              <div
                className="snapshot-progress-track"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={xpProgress}
              >
                <div
                  className="snapshot-progress-fill"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
              <p className="snapshot-meta">{xpMeta}</p>
              {!!xp?.achievements?.length && (
                <div className="snapshot-tags">
                  {xp.achievements.map((achievement) => (
                    <span key={achievement} className="snapshot-tag">
                      {achievement}
                    </span>
                  ))}
                </div>
              )}
            </article>
          </div>
        </>
      )}
    </section>
  )
}

export default WeeklySnapshot
