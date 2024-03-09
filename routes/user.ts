import { Router } from "express"
import bcrypt from "bcrypt"
const router = Router()
import schema from "../models/index"
import jwt from "jsonwebtoken"
// @ts-expect-error no declaration file for express-limit
import { limit } from "express-limit"
import errors from "../config/errors"

router.post("/login", limit({
    max: 5,        // 5 requests
    period: 60 * 1000 // per minute (60 seconds)
}), async (req, res) => {
    const phone = req.body.phone

    try {
        const user = await schema.user.findOne({ phone })

        if (user == null) {
            return res.json(errors.accNotFound)
        }

        const password = req.body.password
        const hash = user.password

        bcrypt.compare(password, hash, function (err, result) {
            if (err) {
                console.error(err)
                res.json(errors.internalError).status(500)
            }
            if (result) {
                const updatedDocs = {
                    _id: user._id,
                    phone: user.phone
                }
                const token = jwt.sign(updatedDocs, process.env.SECRET as string, { expiresIn: "72h" })
                try {
                    schema.user.findOneAndUpdate({ _id: updatedDocs._id }, { token })
                    res.json({
                        token,
                        docs: updatedDocs,
                        expiresIn: "72h"
                    })
                } catch (err) {
                    console.error(err)
                    res.json(errors.internalError).status(500)
                }
            } else {
                res.json(errors.accNotFound)
            }
        })
    } catch (err) {
        console.error(err)
        res.json(errors.internalError).status(500)
    }

})

router.post("/register", limit({
    max: 5,        // 5 requests
    period: 60 * 1000 // per minute (60 seconds)
}), async (req, res) => {
    const saltRounds = 10
    const password = req.body.password

    // generate salt and hash for password encryption
    bcrypt.genSalt(saltRounds, function (err, salt) {
        if (err) { return res.json(errors.internalError).status(500) }
        bcrypt.hash(password, salt, function (err, hash) {

            if (err) { return res.json(errors.internalError).status(500) }
            // create new user
            const userNew = new schema.user({
                companyName: req.body.companyName,
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                phone: req.body.phone,
                type: req.body.type,
                password: hash.toString()
            })

            try {
                userNew.save()
            } catch (err) {
                console.error(err)
                res.json(errors.internalError).status(500)
            }

        })
    })
})

router.post("/update/:id", async (req, res) => {
    // { query: { _id: 'some_id_here' }, update: { password: 'new_password_hash'} }
    const user_id = req.params.id
    // check if update contains updated password, if yes then hash it and replace naked password in request body's field "password"
    if (req.body.update.password) {
        bcrypt.genSalt(10, function (err, salt) {
            if (err) { return res.json(errors.internalError).status(500) }
            bcrypt.hash(req.body.update.password, salt, function (err, hash) {
                if (err) { return res.json(errors.internalError).status(500) }
                req.body.password = hash.toString()
            })
        })
    }

    try {
        await schema.user.findByIdAndUpdate(user_id, req.body.update)
    } catch (err) {
        console.error(err)
        res.json(errors.internalError).status(500)
    }
})

router.get("/find", async (req, res) => {
    try {
        const users = await schema.user.find({})
        res.json(users)
    } catch (err) {
        console.error(err)
        res.json(errors.internalError).status(500)
    }
})

router.get("/find/:id", async (req, res) => {
    const userID = req.params.id
    try {
        const user = await schema.user.findById(userID)
        res.json(user)
    } catch (err) {
        console.error(err)
        res.json(errors.internalError).status(500)
    }
})

router.post("/remove/:id", async (req, res) => {
    const userID = req.params.id
    try {
        await schema.user.findByIdAndDelete(userID)
        res.end()
    } catch (err) {
        console.error(err)
        res.json(errors.internalError).status(500)
    }
})

router.delete("/remove/:user_id/liked/:pet_id", async (req, res) => {
    try {
        const user_id = req.params.user_id
        const pet_id = req.params.pet_id

        // Find the user document by user_id
        const user = await schema.user.findById(user_id)

        if (!user) {
            return res.status(404).json({ error: "User not found" })
        }

        // Remove the pet_id from the liked array
        user.liked = user.liked.filter(_petID => (_petID as unknown as string) != pet_id)

        // Update the user document with the modified liked array
        const updatedUser = await user.save()

        // Respond with the updated user document
        res.json(updatedUser)
    } catch (err) {
        // Handle any errors that occur during the process
        res.status(500).json({ error: "Internal server error" })
    }
})


export default router