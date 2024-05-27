import { Router } from "express"
const router = Router()
import schema, { userSchema } from "../models"
import jwt from "jsonwebtoken"
// @ts-expect-error no declaration file for express-limit
import { limit } from "express-limit"
import bcrypt from "bcrypt"
import passport from "passport"
import { config } from "dotenv"
import { WHSendMessage } from "../lib/utils"
config()

router.post("/register", limit({
    max: 5,        // 5 requests
    period: 60 * 1000 // per minute (60 seconds)
}), async (req, res) => {
    const saltRounds = 10
    const password = req.body.password

    try {
        // Check if user exists already
        const userExists = await schema.user.findOne({ phone: req.body.phone })
        if (userExists) {
            return res.json({ msg: "userExists" }).status(400)
        }

        // Generate salt and hash for password encryption
        const salt = await bcrypt.genSalt(saltRounds)
        const hash = await bcrypt.hash(password, salt)

        // Create new user
        const userNew = new schema.user({
            login: req.body.login,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            phone: req.body.phone,
            type: req.body.type,
            instagram: req.body.instagram,
            password: hash
        })

        await userNew.save()
        WHSendMessage("info", "New user registered", "```" + JSON.stringify(userNew) + "```")
        res.end()
    } catch (err) {
        console.error(err)
        WHSendMessage("error", "Failed to register new user", "```" + err + "```")
        res.json({ msg: "internal" }).status(500)
    }
})

router.post("/login", limit({
    max: 5,
    period: 60 * 1000
}), async (req, res, next) => {
    passport.authenticate("local", { session: false }, async (err: Error, user: userSchema & { _id: string }, info: { message: string }) => {
        if (err) return next(err)

        if (!user) {
            return res.status(400).json({ msg: info.message })
        }

        const userSigned = {
            _id: user._id,
            login: user.login,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            type: user.type,
            instagram: user.instagram,
        }

        const token = jwt.sign(userSigned, process.env.SECRET!, { expiresIn: "1y" })

        const userData = await schema.user.findById(userSigned._id)
        if (userData) {
            userData.token = token
            await userData.save()
        }

        WHSendMessage("info", "User logged in", "```" + JSON.stringify(userSigned) + "```")

        res.json({
            token,
            docs: userSigned
        })
    })(req, res, next)
})


export default router
