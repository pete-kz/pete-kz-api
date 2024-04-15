import { Router } from "express"
const router = Router()
import schema from "../models"
import jwt from "jsonwebtoken"
// @ts-expect-error no declaration file for express-limit
import { limit } from "express-limit"
import bcrypt from "bcrypt"
import passport from "passport"
import { config } from "dotenv"
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

        res.end()
    } catch (err) {
        console.error(err)
        res.json({ msg: "internal" }).status(500)
    }
})

router.post("/login", limit({
    max: 5,
    period: 60 * 1000
}), async (req, res, next) => {
    passport.authenticate("local", { session: false }, async (err: Error, user: { _id: string; phone: string }, info: { message: string }) => {
        if (err) return next(err)

        if (!user) {
            return res.status(400).json({ msg: info.message })
        }

        const updatedDocs = {
            _id: user._id,
            phone: user.phone
        }

        const token = jwt.sign(updatedDocs, process.env.SECRET!, { expiresIn: "12h" })
        const refreshToken = jwt.sign(updatedDocs, process.env.REFRESH_TOKEN_SECRET!, { expiresIn: "7d" })

        const userData = await schema.user.findById(user._id)
        if (userData) {
            userData.token = token
            userData.refreshToken = refreshToken
            await userData.save()
        }

        res.json({
            token,
            refreshToken,
            docs: updatedDocs
        })
    })(req, res, next)
})


router.post("/refresh", (req, res, next) => {
    passport.authenticate("jwt-refresh", { session: false }, (err: Error, user: { _id: string; phone: string }) => {
        if (err) return next(err)

        if (!user) {
            return res.status(400).json({ msg: "Invalid refresh token." })
        }

        const updatedDocs = {
            _id: user._id,
            phone: user.phone
        }

        const newToken = jwt.sign(updatedDocs, process.env.SECRET!, { expiresIn: 12 * 60 * 60 * 1000 })

        res.json({
            token: newToken,
        })
    })(req, res, next)
})


export default router
