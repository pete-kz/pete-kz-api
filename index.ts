import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import utils from './utils'
import mongoose from 'mongoose'
import { config } from "dotenv"
config()

const app = express()
const port = process.env.EXPRESS_PORT || 3000
const middlewares = utils.middlewares

const whitelist = [
  'http://kz.allymap.info',
  'https://kz.allymap.info',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://192.168.1.72:4173',
  'http://192.168.1.72:5173',
  'hammerhead-app-q63fx.ondigitalocean.app'
]
app.use(cors({
  origin: (origin, callback) => {
    callback(null, true)
    // console.log('--------------------')
    // console.log(origin)
    // if (whitelist.indexOf(origin) !== -1 || whitelist.includes(origin)) {
    //   callback(null, true)
    // } else {
    //   if (origin == undefined) {
    //     callback(null, true)
    //   } else {
    //     callback(new Error('Not allowed by CORS'))
    //   }
    // }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true
}))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(middlewares.logger)
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
async function mongooseConnect() { await mongoose.connect(url) }
mongooseConnect().catch(err => console.log(err))
const db = mongoose.connection

// importing routes
import userRoute from './routes/user'
import petRoute from './routes/pet'

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
    //@ts-expect-error
    const transformed = array.reduce((acc, {name, ...x}) => { acc[name] = x; return acc}, {})
    console.table(transformed)
  })
  db.on('error', err => {
    console.error('Сonnection error:', err)
  })
})