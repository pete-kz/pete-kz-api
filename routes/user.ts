import { Router } from "express"
import bcrypt from 'bcrypt'
const router = Router()
import schema from '../models'
import jwt from 'jsonwebtoken'
// @ts-expect-error
import { limit } from 'express-limit'
import errors from '../config/errors'

router.post('/login', limit({
    max: 5,        // 5 requests
    period: 60 * 1000 // per minute (60 seconds)
}), (req, res) => {
    const login = req.body.login
    // @ts-ignore
    schema.user.findOne({ login }, (err, docs) => {
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
                    login: docs.login
                }
                let token = jwt.sign(updatedDocs, process.env.SECRET as string)
                // @ts-ignore
                schema.user.findOneAndUpdate({ _id: docs._id }, { token }, (err, docs) => {
                    if (err) { res.json(errors.internalError).status(500) }
                    res.json({
                        token,
                        docs: updatedDocs,
                        expiresIn: 360
                    })
                })
            }
        })
    })
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
                password: hash.toString(),
            })
            // @ts-ignore
            userNew.save((err, docs) => {
                if (err) { return res.json(errors.accExists).status(403) }
                res.json(docs)
            })

        })
    })
})

router.post('/update', (req, res) => {
    // { query: { _id: 'some_id_here' }, update: { password: 'new_password_hash'} }
    // @ts-ignore
    schema.user.findOneAndUpdate(req.body.query, req.body.update, (err, docs) => {
        if (err) { res.json(errors.internalError).status(500) }
        res.json(docs)
    })
})

router.post('/find', (req, res) => {
    // { query: { token: 'some_token_here' } }
    // @ts-ignore
    schema.user.findOne(req.body.query, (err, docs) => {
        if (err) { res.json(errors.internalError).status(500) }
        else if (docs == null) { res.json(errors.internalError).status(500) }
        else { res.json(docs) }
    })
})

router.post('/remove', (req, res) => {
    // @ts-ignore
    schema.user.findByIdAndDelete(req.body.query, (err, docs) => {
        if (err) { res.json(errors.internalError).status(500) }
        else if (docs == null) { res.json(errors.internalError).status(500) }
        else { res.json(docs) }
    })
})

router.post('/find/all', (req, res) => {
    // { query: { token: 'some_token_here' } }
    // @ts-ignore
    schema.user.find({}, (err, docs) => {
        if (err) { res.json(errors.internalError).status(500) }
        else if (docs == null) { res.json(errors.internalError).status(500) }
        else { res.json(docs) }
    })
})
 
export default router