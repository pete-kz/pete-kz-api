import { Router } from "express"
import bcrypt from "bcrypt"
const router = Router()
import schema from "../models/index"
import utils, { WHSendMessage } from "../lib/utils"

router.get("/", utils.middlewares.requireAuth, async (req, res) => {
    try {
        const user = await schema.user.findOne({ token: req.headers.authorization?.split(" ")[1] })
        WHSendMessage("info", `${user?.firstName + " " + user?.lastName} is looking at their profile!`)
        res.json(user)
    } catch (err) {
        console.error(err)
        WHSendMessage("error", "Failed to get user", "```" + err + "```")
        res.status(500).json({ msg: "internal" })
    }
})

router.post("/", utils.middlewares.requireAuth, async (req, res) => {
    // check if update contains updated password, if yes then hash it and replace naked password in request body's field "password"
    if (req.body.update.password) {
        bcrypt.genSalt(10, function (err, salt) {
            if (err) {
                console.error(err)
                return res.json({ msg: "internal" }).status(500)
            }
            bcrypt.hash(req.body.update.password, salt, function (err, hash) {
                if (err) {
                    console.error(err)
                    return res.json({ msg: "internal" }).status(500)
                }
                req.body.password = hash.toString()
            })
        })
    }

    try {
        WHSendMessage("info", "User updated", "```" + JSON.stringify(req.body.update) + "```")
        await schema.user.findOneAndUpdate({ token: req.headers.authorization?.split(" ")[1] }, req.body.update)
        res.end()
    } catch (err) {
        WHSendMessage("error", "Failed to update user", "```" + err + "```")
        console.error(err)
        res.json({ msg: "internal" }).status(500)
    }
})

router.get("/pets", utils.middlewares.requireAuth, async (req, res) => {
    try {
        const user = await schema.user.findOne({ token: req.headers.authorization?.split(" ")[1] })
        const pets = await schema.pet.find()
        res.json(pets.filter(pet => pet.ownerID?.toString() == user?._id.toString()))
        WHSendMessage("info", `${user?.firstName + " " + user?.lastName} is looking at their pets!`)
    } catch (err) {
        console.error(err)
        WHSendMessage("error", "Failed to get user's pets", "```" + err + "```")
        res.status(500).json({ msg: "internal" })
    }
})

export default router