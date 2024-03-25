import { Router } from "express"
import bcrypt from "bcrypt"
const router = Router()
import schema from "../models/index"
import utils from "../lib/utils"

router.post("/update/:id", utils.middlewares.requireAuth, async (req, res) => {
    // { query: { _id: 'some_id_here' }, update: { password: 'new_password_hash'} }
    const user_id = req.params.id
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
        await schema.user.findByIdAndUpdate(user_id, req.body.update)
        res.end()
    } catch (err) {
        console.error(err)
        res.json({ msg: "internal" }).status(500)
    }
})

router.get("/find", async (req, res) => {
    try {
        const users = await schema.user.find({})
        res.json(users)
    } catch (err) {
        console.error(err)
        res.json({ msg: "internal" }).status(500)
    }
})

router.get("/find/:id", async (req, res) => {
    const userID = req.params.id
    if (userID === "me") {
        return res.json({ msg: "notImplemented" }).status(501)
    }
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

router.post("/remove/:id", utils.middlewares.requireAuth, async (req, res) => {
    const userID = req.params.id
    try {
        await schema.user.findByIdAndDelete(userID)
        res.end()
    } catch (err) {
        console.error(err)
        res.json({ msg: "internal" }).status(500)
    }
})

router.delete("/remove/:user_id/liked/:pet_id", utils.middlewares.requireAuth, async (req, res) => {
    try {
        const user_id = req.params.user_id
        const pet_id = req.params.pet_id

        // Find the user document by user_id
        const user = await schema.user.findById(user_id)

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

router.get("/me", utils.middlewares.requireAuth, async (req, res) => {
    try {
        const user = await schema.user.findOne({ token: req.headers.authorization?.split(" ")[1] })
        res.json(user)
    } catch (err) {
        console.error(err)
        res.status(500).json({ msg: "internal" })
    }
})

router.get("/me/liked", utils.middlewares.requireAuth, async (req, res) => {
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

router.get("/me/pets", utils.middlewares.requireAuth, async (req, res) => {
    try {
        const user = await schema.user.findOne({ token: req.headers.authorization?.split(" ")[1] })
        const pets = await schema.pet.find({ ownerID: user?._id })
        res.json(pets)
    } catch (err) {
        console.error(err)
        res.status(500).json({ msg: "internal" })
    }
})

export default router