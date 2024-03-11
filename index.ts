import express from "express"
import cors from "cors"
import helmet from "helmet"
import { utils } from "./lib/utils"
import mongoose from "mongoose"
import { config } from "dotenv"
config()

const app = express()
const port = process.env.PORT || 3000
const middlewares = utils.middlewares
let reqCount = 0
let lastTime = Date.now()
let totalRequestsPerMinute = 0

const whitelist = [
  "http://localhost:5173",
  "http://localhost:4173",
  "https://pete-alpha.vercel.app", 
  "https://pete.kz", 
  "https://preview.pete.kz",
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || whitelist.indexOf(origin) !== -1 || origin.includes("192.168.1.")) {
      // Allow requests with no origin (like mobile apps or curl requests) and whitelisted origins
      callback(null, true)
    } else {
      callback(new Error("Not allowed by CORS"))
    }
  },
  methods: ["GET", "POST", "OPTIONS", "DELETE"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization", "Cache-Control", "Expires", "Pragma"],
  credentials: true,
}))

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use((req, res, next) => {
  console.info(req.headers.origin, req.method, req.url)
  reqCount++
  if (Date.now() > (lastTime + 60 * 1000)) {
    const totalMinutesTake = Math.round((Date.now() - lastTime) / 1000 / 60)
    console.info(`For the last ${totalMinutesTake} minutes there was ${reqCount} calls.`)
    const requestsPerMinute = Math.round(reqCount / totalMinutesTake)
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
const url = process.env.MONGO_URI || ""
mongoose.set("strictQuery", true)
async function mongooseConnect() { await mongoose.connect(url, { dbName: process.env.DB_NAME || "petinder_dev" }) }
mongooseConnect().catch(err => console.log(err))
const db = mongoose.connection

// importing routes
import userRoute from "./routes/user"
import petRoute from "./routes/pet"

// express routes setup
app.use("/pets", petRoute)
app.use("/users", userRoute)

app.get("/api", (req, res) => {
  res.send("Hello from Petinder API!")
})

app.get("/", (req, res) => {
  res.send("Hello from Petinder API!")
})

app.listen(port, () => {
  db.once("open", () => { // Remove the unused variable '_'
    const API = { name: "API_PORT", value: port }
    const MONGODB = { name: "MONGODB_URL", value: url }
    const SECRET = { name: "JWT_SECRET", value: process.env.SECRET }
    const array = [API, MONGODB, SECRET]

    // @ts-expect-error idk some kind of error that im too lazy to fix
    const transformed = array.reduce((acc, { name, ...x }) => { acc[name] = x; return acc }, {})
    console.table(transformed)
  })
  db.on("error", err => {
    console.error("Сonnection error:", err)
  })
})