import { useEffect, useState } from 'react'
import { apiRequest } from '../utils/api.js'

function WeeklySnapshot() {
  const [snapshot, setSnapshot] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadSnapshot() {
      setStatus('loading')
      setError(null)
      try {
        const response = await apiRequest('/api/stats/overview', { signal: controller.signal })
        if (!response.ok) throw new Error(`Request failed (${response.status})`)
        setSnapshot(await response.json())
        setStatus('success')
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unable to load stats')
          setStatus('error')
        }
      }
    }

    loadSnapshot()
    return () => controller.abort()
  }, [])

  if (status === 'loading') {
    return (
      <section className="snapshot-section">
        <div className="snapshot-placeholder">Loading...</div>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section className="snapshot-section">
        <div className="snapshot-error">
          <span>Failed to load stats: {error}</span>
          <button type="button" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </section>
    )
  }

  if (!snapshot) return null

  const { totals, completionRate, weeklyFocusMinutes, weeklyProgress, streakDays, streak, gamification } = snapshot
  const weekStart = weeklyProgress?.[0]?.label
  const weekEnd = weeklyProgress?.[weeklyProgress.length - 1]?.label
  const lastMiss = streak.lastMissedDay
    ? new Date(streak.lastMissedDay).toLocaleDateString(undefined, { weekday: 'short' })
    : null

  return (
    <section className="snapshot-section">
      <header className="snapshot-header">
        <div>
          <p className="snapshot-eyebrow">Weekly Snapshot</p>
          <h2 className="snapshot-title">Momentum check-in</h2>
          <p className="snapshot-description">
            {weeklyFocusMinutes} focus minutes logged | {weekStart} to {weekEnd}
          </p>
        </div>
      </header>

      <div className="snapshot-grid">
        <article className="snapshot-card snapshot-card-merged">
          <div className="snapshot-merged-section">
            <p className="snapshot-label">Completion rate</p>
            <p className="snapshot-value">{completionRate.toFixed(1)}%</p>
            <p className="snapshot-subtext">{totals.completedTasks}/{totals.totalTasks} tasks closed</p>
          </div>
          <div className="snapshot-merged-divider"></div>
          <div className="snapshot-merged-section">
            <p className="snapshot-label">Streak</p>
            <p className="snapshot-value">{streakDays} days</p>
            <p className="snapshot-subtext">Longest: {streak.longest} days</p>
            {lastMiss && <p className="snapshot-meta">Last miss: {lastMiss}</p>}
          </div>
        </article>

        <article className="snapshot-card">
          <p className="snapshot-label">XP progress</p>
          <p className="snapshot-value">{gamification.xp} XP</p>
          <p className="snapshot-subtext">Level {gamification.level}</p>
          <div className="snapshot-progress-track">
            <div className="snapshot-progress-fill" style={{ width: `${gamification.progressPercent}%` }} />
          </div>
          <p className="snapshot-meta">{gamification.xpIntoLevel} / {gamification.xpPerLevel} XP to next level</p>
          {gamification.achievements?.length > 0 && (
            <div className="snapshot-tags">
              {gamification.achievements.map((achievement) => (
                <span key={achievement} className="snapshot-tag">{achievement}</span>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  )
}

export default WeeklySnapshot
