import { Router } from 'express'
const router = Router()
import schema from '../models/index.js'
import errors from '../config/errors.js'
import multer from 'multer'
import AWS from 'aws-sdk'
import multerS3 from 'multer-s3'

import dotenv from 'dotenv'
dotenv.config()

const spacesEndpoint = new AWS.Endpoint(process.env.AWS_ENDPOINT);
const s3 = new AWS.S3({
    endpoint: spacesEndpoint,
    region: 'fra1',
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
})

const upload = multer({
    dest: './images',
    limits : { fileSize: 15000000 },
    storage: multerS3({
        s3: s3,
        acl: 'public-read',
        bucket: 'petinder',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            cb(null, `pet_images/${Date.now().toString()}.${file.originalname.split('.')[1]}`)
        }
    })
})

router.post('/find', (req, res) => {
    
    schema.pet.find(req.body.query || {}).then((docs, err) => {
        if (err) { return res.json(errors.internalError).status(500) }
        if (docs) { res.json(docs) }
    })
})

router.get('/find/all', (req, res) => {
    schema.pet.find({}).then((docs, err) => {
        if (err) { return res.json(errors.internalError).status(500) }
        if (docs) { res.json(docs) }
    })
})

// Add new pet
router.post('/add', upload.array('images'), (req, res) => {
    
    let imagesPaths = []
    if (req.files != undefined) {
        req.files.map(file => {
            imagesPaths.push(file.location)
        })
    }

    const requestBody = {
        name: req.body.name[0],
        age: req.body.age,
        type: req.body.type,
        description: req.body.description,
        userID: req.body.userID,
        imagesPath: imagesPaths,
        city: req.body.city,
    }
    const newPet = new schema.pet(requestBody)
    
    newPet.save().then((docs, err) => {
        if (err) { return res.json(errors.internalError).status(500) }
        res.json(docs)
    })
})

// Remove existing pet
router.post('/remove', (req, res) => {
    // query: { _id: some_id_here }
    schema.pet.findOneAndDelete(req.body.query).then((docs, err) => {
        if (err) { return res.json(errors.internalError).status(500) }
        res.json(docs)
    })
})

// Edit existing pet
router.post('/edit', (req, res) => {
    // { query: { id }, updated: { address: ryskulova } }
    schema.pet.findOneAndUpdate(req.body.query, req.body.updated).then((docs, err) => {
        if (err) { return res.json(errors.internalError).status(500) }
        else { res.json(docs) }
    })
})

export default router