import express from 'express'
import cors from 'cors'
import helmet from 'helmet'

const app = express()
const PORT = process.env.PORT ?? 3000

app.use(helmet())
app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: '{{project_name}}' })
})

app.get('/api/v1', (_req, res) => {
  res.json({ message: 'Welcome to {{project_name}} API' })
})

app.listen(PORT, () => {
  console.log(`🚀 {{project_name}} running on http://localhost:${PORT}`)
})

export default app
