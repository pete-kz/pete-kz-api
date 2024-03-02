import { Router } from 'express'
import multer from 'multer'
import AWS from 'aws-sdk'
import sharp from 'sharp'
import dotenv from 'dotenv'
import schema from '../models/index.js'
import errors from '../config/errors.js'

dotenv.config()

const router = Router()
const spacesEndpoint = new AWS.Endpoint(process.env.AWS_ENDPOINT)
const s3 = new AWS.S3({
    endpoint: spacesEndpoint,
    region: 'fra1',
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
})

// Setup multer for in-memory storage
const upload = multer({
    limits: { fileSize: 15000000 },
    storage: multer.memoryStorage(),
})

// Process and upload images
const processImagesAndUpload = (req, res, next) => {
    if (!req.files) {
        return next() // Continue without processing if no files are uploaded
    }

    // Process each file using Sharp and upload to S3
    const uploadPromises = req.files.map(file => {
        return sharp(file.buffer)
            .resize(1024) // Optional: Adjust size
            .jpeg({ quality: 80 }) // Optional: Adjust format and quality
            .toBuffer()
            .then(buffer => {
                const params = {
                    Bucket: process.env.BUCKET_NAME,
                    Key: `images/pet/${Date.now().toString()}.${file.originalname.split('.')[1]}`,
                    Body: buffer,
                    ACL: 'public-read',
                    ContentType: 'image/jpeg', // Change as needed
                }
                return s3.upload(params).promise()
            })
    })

    const uploadDomain = `https://${process.env.BUCKET_NAME}.${process.env.AWS_ENDPOINT.replace('https://', '')}`

    Promise.all(uploadPromises)
        .then(results => {
            // Attach the S3 URLs to the request for further processing
            req.body.imagesPath = results.map(result => result.Location.replace(uploadDomain, process.env.BUCKET_DOMAIN || uploadDomain))
            next()
        })
        .catch(err => {
            res.status(500).json({ error: err.message })
        })
}

router.post('/find', (req, res) => {

    schema.pet.find(req.body.query || {}).then((docs, err) => {
        if (err) { return res.json(err).status(500) }
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
router.post('/add', upload.array('images'), processImagesAndUpload, (req, res) => {
    req.body.name = req.body.name
    const newPet = new schema.pet(req.body)
    newPet.save()
        .then(docs => res.json(docs))
        .catch(err => {
            res.status(500).json({ err })
            console.error(err)
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
router.post('/edit/:id', (req, res) => {
    schema.pet.findByIdAndUpdate(req.params.id, req.body).then((docs, err) => {
        if (err) { return res.json(errors.internalError).status(500) }
        else { res.json(docs) }
    })
})

// Replace existing pet
router.post('/replace/:id', (req, res) => {
    schema.pet.findOneAndReplace({ _id: req.params.id }, req.body).then((docs, err) => {
        if (err) { return res.json(errors.internalError).status(500) }
        else { res.json(docs) }
    })
})

export default router