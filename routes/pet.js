import { Router } from 'express'
const router = Router()
import schema from '../models/index.js'
import errors from '../config/errors.js'
import multer from 'multer'
import AWS from 'aws-sdk'
import multerS3 from 'multer-s3'

AWS.config.update({
    region: 'eu-central-1',
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
})

const s3 = new AWS.S3()

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
            cb(null, `${Date.now().toString()}.${file.originalname.split('.')[1]}`)
        }
    })
})

router.post('/find', (req, res) => {
    
    schema.pet.find(req.body.query || {}, (err, docs) => {
        if (err) { return res.json(errors.internalError).status(500) }
        if (docs) { res.json(docs) }
    })
})

// Add new pet
router.post('/add', upload.single('image'), (req, res) => {
    let imagePath = ''
    
    if (req.file != undefined) imagePath = req.file?.location
    const requestBody = {
        name: req.body.name,
        type: req.body.type,
        description: req.body.description,
        userID: req.body.userID,
        imagePath,
        city: req.body.city,
    }
    const newPet = new schema.pet(requestBody)
    
    newPet.save((err, docs) => {
        if (err) { return res.json(errors.internalError).status(500) }
        res.json(docs)
    })
})

// Remove existing pet
router.post('/remove', (req, res) => {
    // { query: { id } }
    
    schema.pet.findOneAndDelete(req.body.query, (err, docs) => {
        if (err) { return res.json(errors.internalError).status(500) }
        res.json(docs)
    })
})

// Edit existing pet
router.post('/edit', (req, res) => {
    // { query: { id }, updated: { address: ryskulova } }
    
    schema.pet.findOneAndUpdate(req.body.query, req.body.updated, (err, docs) => {
        if (err) { return res.json(errors.internalError).status(500) }
        else { res.json(docs) }
    })
})

export default router