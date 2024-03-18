import { Router } from "express"
import bcrypt from "bcrypt"
const router = Router()
import schema from "../models/index"
import jwt from "jsonwebtoken"
// @ts-expect-error no declaration file for express-limit
import { limit } from "express-limit"
import utils from "../lib/utils"
import { config } from "dotenv"
config()

router.post("/refresh", utils.middlewares.requireAuth, async (req, res) => {
    try {
        const user = await schema.user.findById(req.body.authUserState._id)
        if (!user) {
            return res.json({ msg: "userNotFound" }).status(400)
        }
        const updatedDocs = {
            _id: user._id,
            phone: user.phone
        }
        const newToken = jwt.sign(updatedDocs, process.env.SECRET as string, { expiresIn: 60 * 1000 })
        user.token = newToken
        await schema.user.findOneAndUpdate({ _id: user._id }, { $set: user }, { new: true })
        res.json({
            token: newToken,
        })
    } catch (err) {
        console.error(err)
        res.json({ msg: "internal" }).status(500)
    }
})

router.post("/login", limit({
    max: 5,        // 5 requests
    period: 60 * 1000 // per minute (60 seconds)
}), async (req, res) => {
    const phone = req.body.phone
    try {
        const user = await schema.user.findOne({ phone })
        if (user == null) {
            return res.json({ msg: "userNotFound" }).status(400)
        }
        const password = req.body.password
        const hash = user.password
        const result = await bcrypt.compare(password, hash)
        if (result) {
            const updatedDocs = {
                _id: user._id,
                phone: user.phone
            }
            const token = jwt.sign(updatedDocs, process.env.SECRET as string, { expiresIn: "1h" })
            const refreshToken = jwt.sign(updatedDocs, process.env.REFRESH_TOKEN_SECRET as string, { expiresIn: "1d" })
            user.token = token
            user.refreshToken = refreshToken
            await schema.user.findOneAndUpdate({ _id: user._id }, { $set: user }, { new: true })
            res.json({
                token,
                refreshToken,
                docs: updatedDocs
            })
        } else {
            res.json({ msg: "wrongPassword" }).status(400)
        }
    } catch (err) {
        console.error(err)
        res.json({ msg: "internal" }).status(500)
    }
})

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
            companyName: req.body.companyName,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            phone: req.body.phone,
            type: req.body.type,
            password: hash
        })

        await userNew.save()

        res.end()
    } catch (err) {
        console.error(err)
        res.json({ msg: "internal" }).status(500)
    }
})

export default router
