import { Router } from "express"
import bcrypt from "bcrypt"
const router = Router()
import schema from "../models/index"
import utils, { WHSendMessage } from "../lib/utils"

router.get("/", utils.middlewares.requireAuth, async (req, res) => {
    try {
        const user = await schema.user.findOne({ token: req.headers.authorization?.split(" ")[1] })
        res.json(user)
    } catch (err) {
        console.error(err)
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

router.get("/liked", utils.middlewares.requireAuth, async (req, res) => {
    try {
        const user = await schema
            .user
            .findOne({ token: req.headers.authorization?.split(" ")[1] })
            .populate("liked")
            .exec()
        res.json(user?.liked)
    } catch (err) {
        console.error(err)
        res.status(500).json({ msg: "internal" })
    }
})

router.delete("/liked/:pet_id/remove", utils.middlewares.requireAuth, async (req, res) => {
    try {
        const pet_id = req.params.pet_id

        // Find the user document by token
        const user = await schema.user.findOne({ token: req.headers.authorization?.split(" ")[1] })

        if (!user) {
            return res.json({ msg: "internal" }).status(500)
        }

        // Remove the pet_id from the liked array
        user.liked = user.liked.filter(_petID => (_petID as unknown as string) != pet_id)

        // Update the user document with the modified liked array
        const updatedUser = await user.save()

        // Respond with the updated user document
        res.json(updatedUser)
    } catch (err) {
        // Handle any errors that occur during the process
        console.error(err)
        res.json({ msg: "internal" }).status(500)
    }
})

router.get("/pets", utils.middlewares.requireAuth, async (req, res) => {
    try {
        const user = await schema.user.findOne({ token: req.headers.authorization?.split(" ")[1] })
        const pets = await schema.pet.find()
        res.json(pets.filter(pet => pet.ownerID?.toString() == user?._id.toString()))
    } catch (err) {
        console.error(err)
        res.status(500).json({ msg: "internal" })
    }
})

export default router