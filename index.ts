import express from "express"
import cors from "cors"
import helmet from "helmet"
import mongoose from "mongoose"
import { config } from "dotenv"
import passport from "./passport-config"
import { WHSendMessage } from "./lib/utils"
// @ts-expect-error it does not need declaration file
import compression from "compression"
config()

const app = express()
const port = process.env.PORT || 8080
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
      // Allow requests with no origin (like mobile apps or curl requests), whitelisted origins and local requests
      callback(null, true)
    } else {
      callback(new Error("Not allowed by CORS"))
    }
  },
  methods: ["GET", "POST", "OPTIONS", "DELETE"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization", "Cache-Control", "Expires", "Pragma"],
  credentials: true,
}))

app.use(passport.initialize())
app.use(compression())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use((req, res, next) => {
  console.info(req.headers.origin, req.method, req.url)
  reqCount++
  if (Date.now() > (lastTime + 60 * 1000)) {
    const totalMinutesTake = Math.round((Date.now() - lastTime) / 1000 / 60)
    console.info(`For the last ${totalMinutesTake} minutes there was ${reqCount} calls.`)
    const requestsPerMinute = Math.round(reqCount / totalMinutesTake)
    totalRequestsPerMinute = totalRequestsPerMinute ? (totalRequestsPerMinute + requestsPerMinute) / 2 : requestsPerMinute
    console.info(`Average calls per minute: ${totalRequestsPerMinute}`)
    lastTime = Date.now()
    reqCount = 0
  }

  next()
})
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
import authRoute from "./routes/auth"
import meRoute from "./routes/me"

// express routes setup
app.use("/pets", petRoute)
app.use("/users/me", meRoute)
app.use("/users", userRoute)
app.use("/auth", authRoute)


app.get("/healthcheck", async (req, res) => {
  res.status(200).send("OK")
})

app.listen(port, () => {
  WHSendMessage("info", "Started server")
  db.once("open", () => { // Remove the unused variable '_'
    console.log("Connected to MongoDB")
    WHSendMessage("info", "Connected to MongoDB")
  })
  db.on("error", err => {
    console.error("Сonnection error:", err)
    WHSendMessage("error", "Сonnection to MongoDB was unsuccessful", "```" + err + "```")
  })
})
