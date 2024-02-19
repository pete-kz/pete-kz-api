import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import utils from './utils.js'
import mongoose from 'mongoose'
import { config } from "dotenv"
config()

const app = express()
const port = process.env.EXPRESS_PORT || 3000
const middlewares = utils.middlewares
let reqCount = 0
let lastTime = Date.now()
let totalRequestsPerMinute = 0

const whitelist = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://pete-alpha.vercel.app', // Add this line
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || whitelist.indexOf(origin) !== -1 || origin.includes('192.168.1.')) {
      // Allow requests with no origin (like mobile apps or curl requests) and whitelisted origins
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true,
}))

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use((req, res, next) => {
  console.info(req.headers.origin, req.method, req.url)
  reqCount++
  if (Date.now() > (lastTime + 60 * 1000)) {
    let totalMinutesTake = Math.round((Date.now() - lastTime) / 1000 / 60)
    console.info(`For the last ${totalMinutesTake} minutes there was ${reqCount} calls.`)
    let requestsPerMinute = Math.round(reqCount / totalMinutesTake)
    if (totalRequestsPerMinute == 0) {
      totalRequestsPerMinute = requestsPerMinute
    } else {
      totalRequestsPerMinute = (totalRequestsPerMinute + requestsPerMinute) / 2
    }
    console.info(`Average calls per minute: ${totalRequestsPerMinute}`)
    lastTime = Date.now()
    reqCount = 0
  }

  next()
})
app.use(middlewares.authenticate)
app.use(helmet.dnsPrefetchControl())
app.use(helmet.frameguard())
app.use(helmet.hidePoweredBy())
app.use(helmet.hsts())
app.use(helmet.ieNoOpen())
app.use(helmet.noSniff())
app.use(helmet.originAgentCluster())
app.use(helmet.permittedCrossDomainPolicies())
app.use(helmet.referrerPolicy())
app.use(helmet.xssFilter())

//mongoose setup
const url = process.env.MONGO_URI || ''
mongoose.set('strictQuery', true)
async function mongooseConnect() { await mongoose.connect(url, { dbName: process.env.DB_NAME || 'petinder_dev' }) }
mongooseConnect().catch(err => console.log(err))
const db = mongoose.connection

// importing routes
import userRoute from './routes/user.js'
import petRoute from './routes/pet.js'

// express routes setup
app.use('/pets', petRoute)
app.use('/users', userRoute)

app.get('/api', (req, res) => {
  res.send('Hello from Petinder API!')
})

app.get('/', (req, res) => {
  res.send('Hello from Petinder API!')
})

app.listen(port, () => {
  db.once('open', _ => {
    const API = { name: 'API_PORT', value: port }
    const MONGODB = { name: 'MONGODB_URL', value: url }
    const SECRET = { name: 'JWT_SECRET', value: process.env.SECRET }
    // const ACCESS_KEY_ID = { name: 'ACCESS_KEY_ID', value: security.accessKeyId }
    // const SECRET_ACCESS_KEY = { name: 'SECRET_ACCESS_KEY', value: security.secretAccessKey }
    const array = [API, MONGODB, SECRET]

    const transformed = array.reduce((acc, { name, ...x }) => { acc[name] = x; return acc }, {})
    console.table(transformed)
  })
  db.on('error', err => {
    console.error('Сonnection error:', err)
  })
})