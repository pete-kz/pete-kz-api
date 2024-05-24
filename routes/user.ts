import { Router } from "express"
const router = Router()
import schema from "../models/index"
import { WHSendMessage } from "../lib/utils"

router.get("/", async (req, res) => {
    try {
        const users = await schema.user.find({})
        res.json(users)
    } catch (err) {
        console.error(err)
        res.json({ msg: "internal" }).status(500)
    }
})

router.get("/:id", async (req, res) => {
    const userID = req.params.id
    if (userID === "undefined") {
        return res.json({ msg: "badRequest" }).status(400)
    }
    try {
        const user = await schema.user.findById(userID)
        res.json(user)
    } catch (err) {
        console.error(err)
        WHSendMessage("error", "Failed to fetch user", "```" + err + "```")
        res.json({ msg: "internal" }).status(500)
    }
})

router.get("/:id/pets", async (req, res) => {
    try {
        const userID = req.params.id
        const user = await schema.user.findById(userID)
        if (!user) {
            return res.status(404).json({ msg: "User not found" })
        }
        const pets = await schema.pet.find()
        WHSendMessage("info", `Someone is looking at ${user?.firstName + " " + user?.lastName}'s profile`)
        res.json(pets.filter(pet => pet.ownerID?.toString() == userID))
    } catch (err) {
        console.error(err)
        WHSendMessage("error", "Failed to get user's pets", "```" + err + "```")
        res.status(500).json({ msg: "internal" })
    }
})

export default router