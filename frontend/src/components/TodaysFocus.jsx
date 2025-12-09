import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiCall } from '../utils/api.js'

const PRIORITY_META = {
  high: { label: 'High priority', className: 'priority-high' },
  medium: { label: 'Medium priority', className: 'priority-medium' },
  low: { label: 'Low priority', className: 'priority-low' }
}

function getPriorityMeta(priority = 'medium') {
  return PRIORITY_META[priority] ?? PRIORITY_META.medium
}

function getDueMeta(dueDate) {
  if (!dueDate) {
    return { label: 'No due date', tone: 'due-none' }
  }

  const today = new Date()
  const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const due = new Date(dueDate)
  const dueDay = new Date(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate())
  const diffInDays = Math.round((dueDay - currentDay) / (1000 * 60 * 60 * 24))

  if (diffInDays < 0) {
    const days = Math.abs(diffInDays)
    return { label: `Overdue by ${days} day${days === 1 ? '' : 's'}`, tone: 'due-overdue' }
  }

  if (diffInDays === 0) {
    return { label: 'Due today', tone: 'due-today' }
  }

  if (diffInDays === 1) {
    return { label: 'Due tomorrow', tone: 'due-soon' }
  }

  if (diffInDays <= 7) {
    return { label: `Due in ${diffInDays} days`, tone: 'due-soon' }
  }

  return {
    label: `Due ${due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
    tone: 'due-later'
  }
}

function TodaysFocus() {
  const [tasks, setTasks] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updatingTaskId, setUpdatingTaskId] = useState(null)

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiCall('/api/tasks')
      const pendingTasks = (data.tasks ?? []).filter((task) => task.status !== 'completed')
      const sortedTasks = [...pendingTasks].sort((a, b) => {
        const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY
        const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY
        return aDue - bDue
      })
      setTasks(sortedTasks)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const markComplete = async (taskId) => {
    setUpdatingTaskId(taskId)
    try {
      await apiCall(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'completed' })
      })
      setTasks((prev) => prev.filter((task) => task.id !== taskId))
      window.dispatchEvent(new Event('tasks:updated'))
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdatingTaskId(null)
    }
  }

  const visibleTasks = tasks.slice(0, 4)

  const shouldShowFootnote = tasks.length > visibleTasks.length

  return (
    <section className="focus-card">
      <header className="focus-header">
        <div>
          <p className="focus-eyebrow">Today's Focus</p>
          <h3>Ship the work that matters</h3>
          <p className="focus-subtitle">
            Plan up to four key tasks for the day and clear them one by one.
          </p>
        </div>
        <Link className="focus-link" to="/app/tasks">
          View all tasks
        </Link>
      </header>

      {loading && (
        <div className="focus-state">
          <span className="focus-spinner" aria-hidden="true" />
          <p>Loading your tasks…</p>
        </div>
      )}

      {!loading && error && (
        <div className="focus-state focus-error">
          <p>{error}</p>
          <button className="focus-cta" type="button" onClick={loadTasks}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && visibleTasks.length === 0 && (
        <div className="focus-empty">
          <p className="focus-empty-label">Nothing queued</p>
          <h4>You’re all caught up</h4>
          <p>Plan tomorrow’s work or add a new priority task to keep momentum going.</p>
          <Link className="focus-cta" to="/app/tasks">
            Add a task
          </Link>
        </div>
      )}

      {!loading && !error && visibleTasks.length > 0 && (
        <>
          <ul className="focus-task-list">
            {visibleTasks.map((task) => {
              const priority = getPriorityMeta(task.priority)
              const dueMeta = getDueMeta(task.due_date)

              return (
                <li key={task.id} className="focus-task">
                  <div className="focus-task-body">
                    <div className="focus-task-title-row">
                      <h5>{task.title}</h5>
                      <span className={`priority-pill ${priority.className}`}>{priority.label}</span>
                    </div>
                    {task.description && <p className="focus-task-desc">{task.description}</p>}
                    <div className="focus-task-meta">
                      <span className={`due-pill ${dueMeta.tone}`}>{dueMeta.label}</span>
                      {task.estimated_hours && (
                        <span className="duration-pill">{task.estimated_hours}h est.</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="focus-complete-btn"
                    onClick={() => markComplete(task.id)}
                    disabled={updatingTaskId === task.id}
                  >
                    {updatingTaskId === task.id ? 'Completing…' : 'Mark complete'}
                  </button>
                </li>
              )
            })}
          </ul>
          {shouldShowFootnote && (
            <p className="focus-footnote">
              + {tasks.length - visibleTasks.length} more task{tasks.length - visibleTasks.length === 1 ? '' : 's'} scheduled later
            </p>
          )}
        </>
      )}
    </section>
  )
}

export default TodaysFocus
