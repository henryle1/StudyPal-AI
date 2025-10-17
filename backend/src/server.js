const express = require('express')

const app = express()
const PORT = Number.parseInt(process.env.PORT ?? '5000', 10)

app.get('/', (_req, res) => {
  res.json({ message: 'StudyPal backend is ready!' })
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
