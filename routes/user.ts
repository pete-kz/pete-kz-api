import { Router } from "express"
const router = Router()
import schema from "../models/index"

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
        res.json(pets.filter(pet => pet.ownerID?.toString() == userID))
    } catch (err) {
        console.error(err)
        res.status(500).json({ msg: "internal" })
    }
})

export default router