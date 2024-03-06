import { Router } from "express"
import bcrypt from 'bcrypt'
const router = Router()
import schema from '../models/index.js'
import jwt from 'jsonwebtoken'
import { limit } from 'express-limit'
import errors from '../config/errors.js'

router.post('/login', limit({
    max: 5,        // 5 requests
    period: 60 * 1000 // per minute (60 seconds)
}), (req, res) => {
    const phone = req.body.phone
    
    schema.user.findOne({ phone }).then((docs, err) => {
        if (err) { throw err }
        if (docs == null) {
            return res.json(errors.accNotFound)
        }
        const password = req.body.password
        const hash = docs.password
        bcrypt.compare(password, hash, function (err, result) {
            if (err) { res.json(errors.internalError).status(500) }
            if (result) {
                let updatedDocs = {
                    _id: docs._id,
                    login: docs.login,
                    phone: docs.phone
                }
                let token = jwt.sign(updatedDocs, process.env.SECRET)
                schema.user.findOneAndUpdate({ _id: docs._id }, { token }).then((docs, err) => {
                    if (err) { res.json(errors.internalError).status(500) }

                    res.json({
                        token,
                        docs: updatedDocs,
                        expiresIn: 3600
                    })
                })
            } else {
                res.json(errors.accNotFound)
            }
        })
    }).catch(e => console.log(e))
})

router.post('/register', limit({
    max: 5,        // 5 requests
    period: 60 * 1000 // per minute (60 seconds)
}), (req, res) => {
    const saltRounds = 10
    const password = req.body.password

    // generate salt and hash for password encryption
    bcrypt.genSalt(saltRounds, function (err, salt) {
        if (err) { return res.json(errors.internalError).status(500) }
        bcrypt.hash(password, salt, function (err, hash) {

            if (err) { return res.json(errors.internalError).status(500) }
            // create new user
            const userNew = new schema.user({
                login: req.body.login,
                name: req.body.name,
                password: hash.toString(),
                phone: req.body.phone
            })
            
            userNew.save().then((docs, err) => {
                if (err) { return res.json(errors.accExists).status(403) }
                res.json(docs)
            })

        })
    })
})

router.post('/update/:id', (req, res) => {
    // { query: { _id: 'some_id_here' }, update: { password: 'new_password_hash'} }
    const user_id = req.params.id
    // check if update contains updated password, if yes then hash it and replace naked password in request body's field "password"
    if (req.body.update.password) {
        bcrypt.genSalt(10, function (err, salt) {
            if (err) { return res.json(errors.internalError).status(500) }
            bcrypt.hash(password, salt, function (err, hash) {
                if (err) { return res.json(errors.internalError).status(500) }
                req.body.password = hash.toString()
            })
        })
    } 

    schema.user.findByIdAndUpdate(user_id, req.body.update).then((docs, err) => {
        if (err) { res.json(errors.internalError).status(500) }
        res.json(docs)
    })
})

router.post('/find', (req, res) => {
    // { query: { token: 'some_token_here' } }
    schema.user.findOne(req.body.query || {}).then((docs, err) => {
        if (err || !docs) { 
            res.json(errors.internalError).status(500) 
        }
        else { res.json(docs) }
    })
})

router.get('/find/all', (req, res) => {
    schema.user.find({}).then((docs, err) => {
        if (err || !docs) { 
            res.json(errors.internalError).status(500) 
            return
        }
        res.json(docs)
    })
})

router.post('/remove', (req, res) => {
    
    schema.user.findByIdAndDelete(req.body.query, (err, docs) => {
        if (err) { res.json(errors.internalError).status(500) }
        else if (docs == null) { res.json(errors.internalError).status(500) }
        else { res.json(docs) }
    })
})

router.delete('/remove/:user_id/liked/:pet_id', async (req, res) => {
    try {
        const user_id = req.params.user_id
        const pet_id = req.params.pet_id

        // Find the user document by user_id
        const user = await schema.user.findById(user_id)

        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        // Remove the pet_id from the liked array
        user.liked = user.liked.filter(pet => pet != pet_id)

        // Update the user document with the modified liked array
        const updatedUser = await user.save()

        // Respond with the updated user document
        res.json(updatedUser)
    } catch (err) {
        // Handle any errors that occur during the process
        console.error(err)
        res.status(500).json({ error: 'Internal server error' })
    }
})

 
export default router