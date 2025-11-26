import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiCall } from '../utils/api.js'

const DEFAULT_PROFILE = {
  fullName: 'StudyPal Student',
  email: 'student@example.com',
  timezone: 'America/New_York',
  pronouns: 'she/her',
  notifications: {
    digest: true,
    reminders: true,
    aiInsights: false,
    product: false
  }
}

const DEFAULT_INTEGRATIONS = {
  geminiKey: '',
  calendarKey: '',
  syncCalendar: false,
  autoPushTasks: true
}

const TIMEZONES = [
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'Europe/London', label: 'London (BST/UTC)' },
  { value: 'Europe/Paris', label: 'Central Europe (CET)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' }
]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeProfilePayload(profile = {}) {
  return {
    fullName: profile.fullName ?? DEFAULT_PROFILE.fullName,
    email: profile.email ?? DEFAULT_PROFILE.email,
    timezone: profile.timezone ?? DEFAULT_PROFILE.timezone,
    pronouns: profile.pronouns ?? DEFAULT_PROFILE.pronouns,
    notifications: {
      ...DEFAULT_PROFILE.notifications,
      ...(profile.notifications ?? {})
    }
  }
}

function normalizeIntegrationsPayload(integrations = {}) {
  return {
    geminiKey: integrations.geminiKey ?? DEFAULT_INTEGRATIONS.geminiKey,
    calendarKey: integrations.calendarKey ?? DEFAULT_INTEGRATIONS.calendarKey,
    syncCalendar: Boolean(
      integrations.syncCalendar ?? DEFAULT_INTEGRATIONS.syncCalendar
    ),
    autoPushTasks: Boolean(
      integrations.autoPushTasks ?? DEFAULT_INTEGRATIONS.autoPushTasks
    )
  }
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <label className="settings-toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-pill" aria-hidden="true" />
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
    </label>
  )
}

function IntegrationField({ label, placeholder, value, onChange, masked, helper }) {
  const [show, setShow] = useState(false)

  return (
    <label className="integration-field">
      <span>{label}</span>
      <div className="integration-input-wrapper">
        <input
          type={masked && !show ? 'password' : 'text'}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {masked && value && (
          <button type="button" onClick={() => setShow((prev) => !prev)}>
            {show ? 'Hide' : 'Reveal'}
          </button>
        )}
      </div>
      {helper && <small>{helper}</small>}
    </label>
  )
}

function Settings() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE)
  const [integrations, setIntegrations] = useState(DEFAULT_INTEGRATIONS)

  const [initialProfile, setInitialProfile] = useState(DEFAULT_PROFILE)
  const [initialIntegrations, setInitialIntegrations] = useState(DEFAULT_INTEGRATIONS)

  const [profileNotice, setProfileNotice] = useState(null)
  const [integrationNotice, setIntegrationNotice] = useState(null)
  const [profileError, setProfileError] = useState(null)
  const [integrationError, setIntegrationError] = useState(null)

  const [profileLoading, setProfileLoading] = useState(true)
  const [integrationLoading, setIntegrationLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [integrationSaving, setIntegrationSaving] = useState(false)

  const profileDirty = useMemo(
    () => !profileLoading && JSON.stringify(profile) !== JSON.stringify(initialProfile),
    [profile, initialProfile, profileLoading]
  )

  const integrationsDirty = useMemo(
    () => !integrationLoading && JSON.stringify(integrations) !== JSON.stringify(initialIntegrations),
    [integrations, initialIntegrations, integrationLoading]
  )

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true)
    setProfileError(null)
    try {
      const data = await apiCall('/api/settings/profile')
      const normalized = normalizeProfilePayload(data.profile ?? {})
      setProfile(normalized)
      setInitialProfile(normalized)
    } catch (error) {
      setProfileError(error.message)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  const fetchIntegrations = useCallback(async () => {
    setIntegrationLoading(true)
    setIntegrationError(null)
    try {
      const data = await apiCall('/api/settings/integrations')
      const normalized = normalizeIntegrationsPayload(data.integrations ?? {})
      setIntegrations(normalized)
      setInitialIntegrations(normalized)
    } catch (error) {
      setIntegrationError(error.message)
    } finally {
      setIntegrationLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
    fetchIntegrations()
  }, [fetchProfile, fetchIntegrations])

  const updateProfileField = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
    setProfileNotice(null)
    setProfileError(null)
  }

  const updateNotificationField = (field, value) => {
    setProfile((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: value
      }
    }))
    setProfileNotice(null)
    setProfileError(null)
  }

  const updateIntegrationField = (field, value) => {
    setIntegrations((prev) => ({ ...prev, [field]: value }))
    setIntegrationNotice(null)
    setIntegrationError(null)
  }

  const validateProfile = () => {
    if (!profile.fullName.trim()) {
      return 'Please provide your full name.'
    }
    if (!EMAIL_REGEX.test(profile.email)) {
      return 'Enter a valid email address.'
    }
    if (!profile.timezone) {
      return 'Select a timezone.'
    }
    return null
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    const error = validateProfile()
    if (error) {
      setProfileError(error)
      return
    }
    setProfileSaving(true)
    setProfileNotice(null)
    setProfileError(null)
    try {
      const data = await apiCall('/api/settings/profile', {
        method: 'PUT',
        body: JSON.stringify(profile)
      })
      const normalized = normalizeProfilePayload(data.profile ?? profile)
      setProfile(normalized)
      setInitialProfile(normalized)
      setProfileNotice(data.message ?? 'Profile saved')
    } catch (err) {
      setProfileError(err.message)
    } finally {
      setProfileSaving(false)
    }
  }

  const saveIntegrations = async (event) => {
    event.preventDefault()
    setIntegrationSaving(true)
    setIntegrationNotice(null)
    setIntegrationError(null)
    try {
      const data = await apiCall('/api/settings/integrations', {
        method: 'PUT',
        body: JSON.stringify(integrations)
      })
      const normalized = normalizeIntegrationsPayload(data.integrations ?? integrations)
      setIntegrations(normalized)
      setInitialIntegrations(normalized)
      setIntegrationNotice(data.message ?? 'Integrations saved')
    } catch (err) {
      setIntegrationError(err.message)
    } finally {
      setIntegrationSaving(false)
    }
  }

  return (
    <div className="settings-grid">
      <div className="settings-container">
        <section className="settings-card">
        <header className="settings-header">
          <div>
            <h3>Profile settings</h3>
            <p className="settings-subtitle">Manage identity details, timezone, and notifications.</p>
          </div>
          <span className="settings-status">{profile.timezone}</span>
        </header>

        {profileLoading ? (
          <div className="task-state">Loading profile…</div>
        ) : (
          <form className="settings-form" onSubmit={saveProfile}>
            <label className="settings-field">
              <span>Full name</span>
              <input
                type="text"
                value={profile.fullName}
                onChange={(event) => updateProfileField('fullName', event.target.value)}
                placeholder="Your preferred display name"
              />
            </label>

            <label className="settings-field">
              <span>Email address</span>
              <input
                type="email"
                value={profile.email}
                onChange={(event) => updateProfileField('email', event.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label className="settings-field">
              <span>Timezone</span>
              <select value={profile.timezone} onChange={(event) => updateProfileField('timezone', event.target.value)}>
                {TIMEZONES.map((zone) => (
                  <option key={zone.value} value={zone.value}>
                    {zone.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="settings-field">
              <span>Pronouns</span>
              <input
                type="text"
                value={profile.pronouns}
                onChange={(event) => updateProfileField('pronouns', event.target.value)}
                placeholder="she/her, he/him, they/them..."
              />
            </label>

            <div className="settings-section">
              <h3>Notifications</h3>
              <div className="toggle-grid">
                <Toggle
                  label="Weekly progress digest"
                  description="Summary email every Sunday evening."
                  checked={profile.notifications.digest}
                  onChange={(value) => updateNotificationField('digest', value)}
                />
                <Toggle
                  label="Deadline reminders"
                  description="Nudges a day before important due dates."
                  checked={profile.notifications.reminders}
                  onChange={(value) => updateNotificationField('reminders', value)}
                />
                <Toggle
                  label="AI insights"
                  description="Recommendations on what to study next."
                  checked={profile.notifications.aiInsights}
                  onChange={(value) => updateNotificationField('aiInsights', value)}
                />
                <Toggle
                  label="Product updates"
                  description="Occasional email when we launch major features."
                  checked={profile.notifications.product}
                  onChange={(value) => updateNotificationField('product', value)}
                />
              </div>
            </div>

            {profileError && (
              <p className="form-error" role="alert">
                {profileError}
              </p>
            )}

            {profileNotice && (
              <p className="settings-success" role="status">
                {profileNotice}
              </p>
            )}

            <div className="form-actions">
              <button type="submit" className="primary-btn" disabled={!profileDirty || profileSaving}>
                {profileSaving ? 'Saving…' : 'Save profile'}
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setProfile(initialProfile)
                  setProfileError(null)
                  setProfileNotice(null)
                }}
                disabled={!profileDirty || profileSaving}
              >
                Reset
              </button>
            </div>
          </form>
        )}
      </section>

      {/* <section className="settings-card">
        <header className="settings-header">
          <div>
            <p className="settings-eyebrow">Integrations</p>
            <h3>Connect tools that supercharge your plan</h3>
            <p className="settings-subtitle">Add API keys and calendar sync preferences.</p>
          </div>
          <span className="settings-status">{integrations.syncCalendar ? 'Calendar syncing' : 'Manual sync'}</span>
        </header>

        {integrationLoading ? (
          <div className="task-state">Loading integrations…</div>
        ) : (
          <form className="settings-form" onSubmit={saveIntegrations}>
            <IntegrationField
              label="Gemini API key"
              placeholder="SK-XXXX..."
              value={integrations.geminiKey}
              onChange={(value) => updateIntegrationField('geminiKey', value.trim())}
              masked
              helper="Stored securely with your StudyPal account."
            />

            <IntegrationField
              label="Calendar webhook secret"
              placeholder="calendar-secret..."
              value={integrations.calendarKey}
              onChange={(value) => updateIntegrationField('calendarKey', value.trim())}
              masked
              helper="Used to authenticate StudyPal when pushing events."
            />

            <div className="settings-section">
              <p className="section-label">Scheduling</p>
              <div className="toggle-grid">
                <Toggle
                  label="Sync focus blocks to calendar"
                  description="Creates events for each AI generated study block."
                  checked={integrations.syncCalendar}
                  onChange={(value) => updateIntegrationField('syncCalendar', value)}
                />
                <Toggle
                  label="Auto-push new tasks"
                  description="Automatically send high priority tasks to your calendar."
                  checked={integrations.autoPushTasks}
                  onChange={(value) => updateIntegrationField('autoPushTasks', value)}
                />
              </div>
            </div>

            {integrationError && (
              <p className="form-error" role="alert">
                {integrationError}
              </p>
            )}

            {integrationNotice && (
              <p className="settings-success" role="status">
                {integrationNotice}
              </p>
            )}

            <div className="form-actions">
              <button type="submit" className="primary-btn" disabled={!integrationsDirty || integrationSaving}>
                {integrationSaving ? 'Saving…' : 'Save integrations'}
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setIntegrations(initialIntegrations)
                  setIntegrationError(null)
                  setIntegrationNotice(null)
                }}
                disabled={!integrationsDirty || integrationSaving}
              >
                Reset
              </button>
            </div>
          </form>
        )}
      </section> */}
      </div>
    </div>
  )
}

export default Settings
