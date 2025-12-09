import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthContext } from '../context/AuthContext.jsx'
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

const COMMON_PRONOUNS = ['she/her', 'he/him', 'they/them', 'she/they', 'he/they', 'ze/hir']

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
  const { updateUser } = useAuthContext()
  const [profile, setProfile] = useState(DEFAULT_PROFILE)
  const [integrations, setIntegrations] = useState(DEFAULT_INTEGRATIONS)
  const [customPronouns, setCustomPronouns] = useState('')

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
      const pronounMatch = COMMON_PRONOUNS.find(
        (option) => option.toLowerCase() === (normalized.pronouns ?? '').toLowerCase()
      )
      setCustomPronouns(pronounMatch ? '' : normalized.pronouns ?? '')
      // Sync header/user display name/email without refetch loops
      updateUser({ name: normalized.fullName, email: normalized.email })
    } catch (error) {
      setProfileError(error.message)
    } finally {
      setProfileLoading(false)
    }
  }, [updateUser])

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
      await fetchProfile()
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
      await fetchIntegrations()
      setIntegrationNotice(data.message ?? 'Integrations saved')
    } catch (err) {
      setIntegrationError(err.message)
    } finally {
      setIntegrationSaving(false)
    }
  }

  const currentPronounChoice = useMemo(() => {
    const pronounValue = (profile.pronouns ?? '').trim()
    const match = COMMON_PRONOUNS.find((option) => option.toLowerCase() === pronounValue.toLowerCase())
    return match ?? 'custom'
  }, [profile.pronouns])

  const handlePronounOptionChange = (value) => {
    if (value === 'custom') {
      updateProfileField('pronouns', customPronouns)
    } else {
      updateProfileField('pronouns', value)
      setCustomPronouns('')
    }
  }

  const handleCustomPronounsChange = (value) => {
    setCustomPronouns(value)
    updateProfileField('pronouns', value)
  }

  return (
    <div className="settings-container">
      <header className="settings-page-header">
        <h2>Settings</h2>
        <p>Manage your profile and preferences</p>
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
                disabled
                placeholder="you@example.com"
              />
              <small style={{ color: '#6b7280' }}>Email is locked. Contact support to change it.</small>
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
              <select value={currentPronounChoice} onChange={(event) => handlePronounOptionChange(event.target.value)}>
                {COMMON_PRONOUNS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                <option value="custom">Custom</option>
              </select>
              {currentPronounChoice === 'custom' && (
                <input
                  type="text"
                  value={customPronouns}
                  onChange={(event) => handleCustomPronounsChange(event.target.value)}
                  placeholder="Add your pronouns"
                />
              )}
            </label>

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
    </div>
  )
}

export default Settings
