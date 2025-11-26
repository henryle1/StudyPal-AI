import { useEffect, useMemo, useState } from 'react'
import { apiCall } from '../utils/api.js'

function generatePath(data, accessor, { width = 320, height = 160, maxValue: forcedMax }) {
  if (!data.length) return ''
  const maxValue =
    forcedMax ??
    data.reduce((max, entry) => {
      const value = accessor(entry)
      return value > max ? value : max
    }, 0)
  const stepX = width / (data.length - 1 || 1)

  return data
    .map((entry, index) => {
      const x = stepX * index
      const value = accessor(entry)
      const y =
        height - (maxValue === 0 ? 0 : Math.min(value, maxValue) / maxValue) * (height - 10) - 5
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

function Analytics() {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadOverview() {
      setLoading(true)
      setError(null)
      try {
        const data = await apiCall('/api/stats/overview')
        setOverview(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadOverview()
  }, [])

  const weeklyProgress = overview?.weeklyProgress ?? []

  const completionRates = useMemo(() => {
    if (!weeklyProgress.length) {
      return []
    }
    return weeklyProgress.map((day) => {
      const planned = day.planned || 0
      const completionRate =
        planned === 0 ? (day.completed > 0 ? 100 : 0) : Math.round((day.completed / planned) * 100)
      return {
        label: day.label ?? new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' }),
        completed: day.completed,
        planned,
        completionRate
      }
    })
  }, [weeklyProgress])

  const hoursSeries = useMemo(() => {
    if (!weeklyProgress.length) {
      return []
    }
    return weeklyProgress.map((day) => ({
      label: day.label ?? new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' }),
      hours: Number(((day.studyMinutes ?? 0) / 60).toFixed(1))
    }))
  }, [weeklyProgress])

  const cumulativeHours = useMemo(() => {
    let running = 0
    return hoursSeries.map((entry) => {
      running += entry.hours
      return { ...entry, cumulative: Number(running.toFixed(1)) }
    })
  }, [hoursSeries])

  const completionPath = useMemo(
    () => generatePath(completionRates, (entry) => entry.completionRate, { maxValue: 100 }),
    [completionRates]
  )

  const maxHours = Math.max(4, ...hoursSeries.map((entry) => entry.hours || 0))
  const hoursPath = useMemo(
    () => generatePath(hoursSeries, (entry) => entry.hours, { maxValue: maxHours || 4 }),
    [hoursSeries, maxHours]
  )

  const streaks = {
    current: overview?.streak?.current ?? 0,
    best: overview?.streak?.longest ?? 0,
    onTrack: weeklyProgress.slice(-1)[0]?.completed ?? 0,
    goal: weeklyProgress.slice(-1)[0]?.planned ?? 0
  }

  const averageCompletion = completionRates.length
    ? Math.round(
        completionRates.reduce((sum, entry) => sum + entry.completionRate, 0) / completionRates.length
      )
    : 0

  const totalHoursLogged = cumulativeHours.slice(-1)[0]?.cumulative ?? 0

  const taskTotals = overview?.totals ?? { completedTasks: 0, totalTasks: 0 }

  const milestoneBadges = useMemo(() => {
    if (!overview) {
      return []
    }
    const gamification = overview.gamification ?? {}
    const badges = [
      {
        title: 'Level progress',
        description: `Level ${gamification.level ?? 1} · ${gamification.xpIntoLevel ?? 0}/${
          gamification.xpPerLevel ?? 600
        } XP`,
        icon: '🚀',
        color: '#2563eb',
        earned: true
      },
      {
        title: 'Focus streak',
        description: `${streaks.current} day streak (best ${streaks.best})`,
        icon: '🔥',
        color: '#f97316',
        earned: streaks.current > 0
      }
    ]

    const achievements = gamification.achievements ?? []
    achievements.forEach((achievement, index) => {
      badges.push({
        title: achievement.replace(/^[^A-Za-z0-9]+/, ''),
        description: achievement,
        icon: '🏅',
        color: '#22c55e',
        earned: true,
        id: `ach-${index}`
      })
    })

    return badges
  }, [overview, streaks])

  const levelBreakpoints = [
    { label: 'Explorer', target: 20 },
    { label: 'Analyst', target: 40 },
    { label: 'Strategist', target: 60 },
    { label: 'Deep Work Architect', target: 80 }
  ]

  if (loading) {
    return <div className="analytics-grid"><div className="analytics-card">Loading analytics…</div></div>
  }

  if (error) {
    return (
      <div className="analytics-grid">
        <div className="analytics-card">
          <p className="task-state task-error">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="analytics-grid">
      <section className="analytics-card">
        <header className="analytics-header">
          <div>
            <h3>Progress trends</h3>
          </div>
          <div className="analytics-badge">Last {weeklyProgress.length || 0} days</div>
        </header>

        <div className="analytics-stats">
          <div>
            <span>Average completion</span>
            <strong>{averageCompletion}%</strong>
          </div>
          <div>
            <span>Total hours logged</span>
            <strong>{totalHoursLogged}h</strong>
          </div>
          <div>
            <span>Tasks wrapped</span>
            <strong>
              {taskTotals.completedTasks}/{taskTotals.totalTasks}
            </strong>
          </div>
        </div>

        <div className="chart-grid">
          <article className="chart-card">
            <header>
              <div>
                <p className="chart-label">Weekly completion</p>
                <h4>Progress vs. plan</h4>
              </div>
              <span className="chart-value">
                {completionRates.slice(-1)[0]?.completionRate ?? 0}% last day
              </span>
            </header>
            <svg viewBox="0 0 320 160" role="img" aria-label="Weekly completion chart">
              <defs>
                <linearGradient id="completionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(37,99,235,0.4)" />
                  <stop offset="100%" stopColor="rgba(59,130,246,0.05)" />
                </linearGradient>
              </defs>
              <path
                d={`${completionPath} L 320 160 L 0 160 Z`}
                fill="url(#completionGradient)"
                stroke="none"
              />
              <path d={completionPath} fill="none" stroke="#2563eb" strokeWidth="3" />
              {completionRates.map((entry, index) => {
                const stepX = 320 / (completionRates.length - 1 || 1)
                const x = stepX * index
                const y = 160 - (entry.completionRate / 100) * 150
                return (
                  <circle
                    key={`${entry.label}-${index}`}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#1d4ed8"
                    stroke="#f8fafc"
                    strokeWidth="2"
                  />
                )
              })}
            </svg>
            <footer className="chart-footer">
              {completionRates.map((entry, index) => (
                <span key={`${entry.label}-${index}`}>{entry.label}</span>
              ))}
            </footer>
          </article>

          <article className="chart-card">
            <header>
              <div>
                <p className="chart-label">Cumulative hours</p>
                <h4>Momentum over time</h4>
              </div>
              <span className="chart-value">{totalHoursLogged}h</span>
            </header>
            <svg viewBox="0 0 320 160" role="img" aria-label="Cumulative hours chart">
              <defs>
                <linearGradient id="hoursGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <path d={hoursPath} fill="none" stroke="url(#hoursGradient)" strokeWidth="3" />
              {hoursSeries.map((entry, index) => {
                const stepX = 320 / (hoursSeries.length - 1 || 1)
                const x = stepX * index
                const y = 160 - (entry.hours / (maxHours || 1)) * 150
                return (
                  <rect
                    key={`${entry.label}-${index}`}
                    x={x - 6}
                    y={y}
                    width="12"
                    height={160 - y}
                    fill="rgba(168,85,247,0.25)"
                    rx="4"
                  />
                )
              })}
            </svg>
            <footer className="chart-footer">
              {hoursSeries.map((entry, index) => (
                <span key={`${entry.label}-${index}`}>{entry.label}</span>
              ))}
            </footer>
          </article>
        </div>
      </section>

    </div>
  )
}

export default Analytics
