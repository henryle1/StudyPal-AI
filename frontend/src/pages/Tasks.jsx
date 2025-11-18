import { useCallback, useEffect, useMemo, useState } from 'react'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' }
]

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
]

const INITIAL_FORM = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'pending',
  dueDate: '',
  estimatedHours: ''
}

function formatDate(dateString) {
  if (!dateString) return 'No due date'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'No due date'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function Tasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    sort: 'due-date',
    search: ''
  })

  const [formData, setFormData] = useState(INITIAL_FORM)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/tasks')
      if (!res.ok) {
        throw new Error('Failed to load tasks')
      }
      const data = await res.json()
      setTasks(data.tasks ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const filteredTasks = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase()
    let list = [...tasks]
    if (filters.status !== 'all') {
      list = list.filter((task) => task.status === filters.status)
    }
    if (filters.priority !== 'all') {
      list = list.filter((task) => task.priority === filters.priority)
    }
    if (searchTerm) {
      list = list.filter(
        (task) =>
          task.title.toLowerCase().includes(searchTerm) ||
          (task.description ?? '').toLowerCase().includes(searchTerm)
      )
    }

    switch (filters.sort) {
      case 'priority':
        list.sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority))
        break
      case 'status':
        list.sort((a, b) => statusWeight(a.status) - statusWeight(b.status))
        break
      case 'created':
        list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        break
      case 'due-date':
      default:
        list.sort((a, b) => {
          const dateA = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY
          const dateB = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY
          if (dateA === dateB) {
            return new Date(a.created_at) - new Date(b.created_at)
          }
          return dateA - dateB
        })
    }

    return list
  }, [tasks, filters])

  const completedCount = useMemo(() => tasks.filter((task) => task.status === 'completed').length, [tasks])
  const progressPercent = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0

  function priorityWeight(priority) {
    switch (priority) {
      case 'high':
        return 3
      case 'medium':
        return 2
      case 'low':
        return 1
      default:
        return 0
    }
  }

  function statusWeight(status) {
    switch (status) {
      case 'pending':
        return 1
      case 'in_progress':
        return 2
      case 'completed':
        return 3
      default:
        return 0
    }
  }

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  const handleFormChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const resetForm = () => {
    setFormData(INITIAL_FORM)
    setEditingTaskId(null)
  }

  const handleEditTask = (task) => {
    setEditingTaskId(task.id)
    setFormData({
      title: task.title,
      description: task.description ?? '',
      priority: task.priority ?? 'medium',
      status: task.status ?? 'pending',
      dueDate: task.due_date ? task.due_date.slice(0, 10) : '',
      estimatedHours: task.estimated_hours ?? ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setNotice(null)

    const payload = {
      title: formData.title,
      description: formData.description || null,
      priority: formData.priority,
      status: formData.status,
      due_date: formData.dueDate || null,
      estimated_hours: formData.estimatedHours || null
    }

    try {
      const endpoint = editingTaskId ? `/api/tasks/${editingTaskId}` : '/api/tasks'
      const method = editingTaskId ? 'PUT' : 'POST'
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to save task')
      }
      await loadTasks()
      setNotice(editingTaskId ? 'Task updated' : 'Task created')
      resetForm()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusUpdate = async (taskId, nextStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      })
      if (!res.ok) {
        throw new Error('Failed to update task')
      }
      await loadTasks()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      if (!res.ok) {
        throw new Error('Failed to delete task')
      }
      await loadTasks()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="tasks-grid">
      <section className="tasks-card">
        <header className="tasks-card-header">
          <div>
            <h3 className="tasks-eyebrow">Task list</h3>
          </div>
          <div className="tasks-progress">
            <span>{completedCount}/{tasks.length} tasks completed</span>
            <div className="tasks-progress-track">
              <div className="tasks-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </header>

        <div className="task-toolbar">
          <div className="task-filter-group">
            <label>
              Status
              <select name="status" value={filters.status} onChange={handleFilterChange}>
                <option value="all">All</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select name="priority" value={filters.priority} onChange={handleFilterChange}>
                <option value="all">All</option>
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sort by
              <select name="sort" value={filters.sort} onChange={handleFilterChange}>
                <option value="due-date">Due date</option>
                <option value="priority">Priority</option>
                <option value="status">Status</option>
                <option value="created">Newest</option>
              </select>
            </label>
          </div>
          <label className="task-search">
            <input
              type="search"
              name="search"
              placeholder="Search tasks"
              value={filters.search}
              onChange={handleFilterChange}
            />
          </label>
        </div>

        {loading && <div className="task-state">Loading tasks…</div>}
        {error && !loading && <div className="task-state task-error">{error}</div>}

        {!loading && filteredTasks.length === 0 && (
          <div className="task-state">
            <p>No tasks match your filters. Try adjusting your search.</p>
          </div>
        )}

        <ul className="task-list">
          {filteredTasks.map((task) => (
            <li key={task.id} className="task-card">
              <header>
                <div>
                  <h4>{task.title}</h4>
                  <p>{task.description || 'No description provided.'}</p>
                </div>
                <span className={`priority-chip ${task.priority}`}>{task.priority}</span>
              </header>
              <div className="task-meta">
                <span className={`status-pill ${task.status}`}>{task.status.replace('_', ' ')}</span>
                <span className={task.due_date && new Date(task.due_date) < new Date() ? 'due overdue' : 'due'}>
                  {formatDate(task.due_date)}
                </span>
                {task.estimated_hours != null && task.estimated_hours !== '' && (
                  <span className="estimate">{task.estimated_hours}h</span>
                )}
              </div>
              <div className="task-actions">
                <label>
                  Status
                  <select value={task.status} onChange={(event) => handleStatusUpdate(task.id, event.target.value)}>
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={() => handleEditTask(task)}>
                  Edit
                </button>
                <button type="button" className="danger" onClick={() => handleDeleteTask(task.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="tasks-card">
        <header className="tasks-card-header">
          <div>
            <p className="tasks-eyebrow">Create / Edit task</p>
            <h3>{editingTaskId ? 'Update an existing task' : 'Add a new task'}</h3>
            <p className="tasks-subtitle">
              Capture the essentials: title, description, due date, and priority. Switch to edit mode by selecting a task.
            </p>
          </div>
        </header>

        {notice && (
          <div className="task-notice" role="status">
            {notice}
          </div>
        )}

        {error && !loading && (
          <div className="task-state task-error" role="alert">
            {error}
          </div>
        )}

        <form className="task-form" onSubmit={handleSubmit}>
          <label>
            Title
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleFormChange}
              required
              placeholder="e.g. Draft AI presentation"
            />
          </label>

          <label>
            Description
            <textarea
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              rows="3"
              placeholder="Add helpful context"
            />
          </label>

          <div className="task-form-grid">
            <label>
              Priority
              <select name="priority" value={formData.priority} onChange={handleFormChange}>
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select name="status" value={formData.status} onChange={handleFormChange}>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="task-form-grid">
            <label>
              Due date
              <input type="date" name="dueDate" value={formData.dueDate} onChange={handleFormChange} />
            </label>
            <label>
              Estimated hours
              <input
                type="number"
                min="0"
                step="0.5"
                name="estimatedHours"
                value={formData.estimatedHours}
                onChange={handleFormChange}
                placeholder="e.g. 2"
              />
            </label>
          </div>

          <div className="task-form-actions">
            <button type="submit" className="primary-btn" disabled={submitting}>
              {submitting ? 'Saving…' : editingTaskId ? 'Update task' : 'Create task'}
            </button>
            <button type="button" className="ghost-btn" onClick={resetForm} disabled={submitting}>
              Reset
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default Tasks
