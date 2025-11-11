const express = require('express')

const db = require('../db')
const authPlaceholder = require('../middleware/auth')

const router = express.Router()

const DEFAULT_USER_ID = 1

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeNotifications(input = {}) {
  return {
    digest: Boolean(input.digest),
    reminders: Boolean(input.reminders),
    aiInsights: Boolean(input.aiInsights),
    product: Boolean(input.product)
  }
}

async function ensureDefaultUser(defaults = {}) {
  const existing = await db.query('select 1 from users where id = $1', [DEFAULT_USER_ID])
  if (existing.rowCount === 0) {
    await db.query(
      `insert into users (id, name, email)
       values ($1, $2, $3)
       on conflict (id) do nothing`,
      [DEFAULT_USER_ID, defaults.name ?? DEFAULT_PROFILE.fullName, defaults.email ?? DEFAULT_PROFILE.email]
    )
  }
}

let settingsTablesReady = false
async function ensureSettingsTables() {
  if (settingsTablesReady) {
    return
  }
  await db.query(`
    create table if not exists user_profiles (
      user_id integer primary key references users (id) on delete cascade,
      full_name text,
      timezone text,
      pronouns text,
      notifications jsonb default '{}'::jsonb,
      updated_at timestamptz default now()
    );

    create table if not exists user_integrations (
      user_id integer primary key references users (id) on delete cascade,
      gemini_key text,
      calendar_key text,
      sync_calendar boolean default false,
      auto_push_tasks boolean default true,
      updated_at timestamptz default now()
    );
  `)
  settingsTablesReady = true
}

async function fetchUserAccount() {
  const result = await db.query('select id, name, email from users where id = $1', [DEFAULT_USER_ID])
  let user = result.rows[0] ?? null
  if (!user) {
    await ensureDefaultUser()
    const retry = await db.query('select id, name, email from users where id = $1', [DEFAULT_USER_ID])
    user = retry.rows[0] ?? null
  }
  return user
}

async function buildProfilePayload() {
  await ensureSettingsTables()
  const [user, profileRow] = await Promise.all([
    fetchUserAccount(),
    db
      .query(
        'select full_name, timezone, pronouns, notifications from user_profiles where user_id = $1',
        [DEFAULT_USER_ID]
      )
      .then((result) => result.rows[0] ?? null)
  ])

  const notifications = {
    ...DEFAULT_PROFILE.notifications,
    ...(profileRow?.notifications ?? {})
  }

  return {
    fullName: profileRow?.full_name ?? user?.name ?? DEFAULT_PROFILE.fullName,
    email: user?.email ?? DEFAULT_PROFILE.email,
    timezone: profileRow?.timezone ?? DEFAULT_PROFILE.timezone,
    pronouns: profileRow?.pronouns ?? DEFAULT_PROFILE.pronouns,
    notifications
  }
}

async function buildIntegrationsPayload() {
  await ensureSettingsTables()
  const {
    rows: [row]
  } = await db.query(
    'select gemini_key, calendar_key, sync_calendar, auto_push_tasks from user_integrations where user_id = $1',
    [DEFAULT_USER_ID]
  )

  return {
    geminiKey: row?.gemini_key ?? DEFAULT_INTEGRATIONS.geminiKey,
    calendarKey: row?.calendar_key ?? DEFAULT_INTEGRATIONS.calendarKey,
    syncCalendar:
      row?.sync_calendar ?? DEFAULT_INTEGRATIONS.syncCalendar,
    autoPushTasks:
      row?.auto_push_tasks ?? DEFAULT_INTEGRATIONS.autoPushTasks
  }
}

router.get('/profile', authPlaceholder, async (_req, res, next) => {
  try {
    const profile = await buildProfilePayload()
    res.json({ profile })
  } catch (error) {
    next(error)
  }
})

router.put('/profile', authPlaceholder, async (req, res, next) => {
  try {
    const { fullName, email, timezone, pronouns, notifications } = req.body ?? {}

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ error: 'Full name is required' })
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'A valid email is required' })
    }

    const normalizedNotifications = normalizeNotifications(notifications)
    const normalizedTimezone = timezone || DEFAULT_PROFILE.timezone

    await ensureDefaultUser({ name: fullName.trim(), email: email.toLowerCase() })

    await db.query('update users set name = $1, email = $2 where id = $3', [
      fullName.trim(),
      email.toLowerCase(),
      DEFAULT_USER_ID
    ])

    await db.query(
      `insert into user_profiles (user_id, full_name, timezone, pronouns, notifications)
       values ($1, $2, $3, $4, $5::jsonb)
       on conflict (user_id) do update
       set full_name = excluded.full_name,
           timezone = excluded.timezone,
           pronouns = excluded.pronouns,
           notifications = excluded.notifications,
           updated_at = now()`,
      [DEFAULT_USER_ID, fullName.trim(), normalizedTimezone, pronouns ?? '', JSON.stringify(normalizedNotifications)]
    )

    const profile = await buildProfilePayload()
    res.json({ profile, message: 'Profile saved' })
  } catch (error) {
    next(error)
  }
})

router.get('/integrations', authPlaceholder, async (_req, res, next) => {
  try {
    const integrations = await buildIntegrationsPayload()
    res.json({ integrations })
  } catch (error) {
    next(error)
  }
})

router.put('/integrations', authPlaceholder, async (req, res, next) => {
  try {
    const {
      geminiKey = DEFAULT_INTEGRATIONS.geminiKey,
      calendarKey = DEFAULT_INTEGRATIONS.calendarKey,
      syncCalendar = DEFAULT_INTEGRATIONS.syncCalendar,
      autoPushTasks = DEFAULT_INTEGRATIONS.autoPushTasks
    } = req.body ?? {}

    await db.query(
      `insert into user_integrations (user_id, gemini_key, calendar_key, sync_calendar, auto_push_tasks)
       values ($1, $2, $3, $4, $5)
       on conflict (user_id) do update
       set gemini_key = excluded.gemini_key,
           calendar_key = excluded.calendar_key,
           sync_calendar = excluded.sync_calendar,
           auto_push_tasks = excluded.auto_push_tasks,
           updated_at = now()`,
      [DEFAULT_USER_ID, geminiKey, calendarKey, Boolean(syncCalendar), Boolean(autoPushTasks)]
    )

    const integrations = await buildIntegrationsPayload()
    res.json({ integrations, message: 'Integrations saved' })
  } catch (error) {
    next(error)
  }
})

module.exports = router
