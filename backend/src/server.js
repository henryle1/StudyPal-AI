require('dotenv').config()
const createApp = require('./app')
const { connect } = require('./db')

const PORT = Number.parseInt(process.env.PORT ?? '5000', 10)

async function start() {
  await connect()
  const app = createApp()

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`)
  })
}

start().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
