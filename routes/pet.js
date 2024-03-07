import { Router } from 'express'
import multer from 'multer'
import AWS from 'aws-sdk'
import sharp from 'sharp'
import dotenv from 'dotenv'
import schema from '../models/index.js'
import errors from '../config/errors.js'
import { getPaginatedSortedPets } from '../lib/utils.js'

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
            res.status(500).json({ error: err })
        })
}

router.get('/recommendations', async (req, res) => {
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not specified
    const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page if not specified
    
    // Extract and sanitize query parameters
    const { type, sterilized, sex, weight, owner_type } = req.query;
    const filters = {};

    if (type) filters.type = type;
    if (sterilized !== undefined) filters.sterilized = sterilized === 'true'; // Assuming boolean values are passed as 'true' or 'false' strings
    if (sex) filters.sex = sex;
    // if (weight) filters.weight = { $gte: parseInt(weight) }; // Example: pets heavier than or equal to the specified weight
    if (owner_type) filters.owner_type = owner_type;

    console.log(filters.sterilized)
    try {
        const pets = await getPaginatedSortedPets(filters, page, limit);
        res.json(pets); 
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
})


router.get('/find', (req, res) => {
    schema.pet.find({}).then((docs, err) => {
        if (err || !docs) { 
            res.json(errors.internalError).status(500) 
        }
        else { res.json(docs) }
    })
})

router.get('/find/:id', (req, res) => {
    const petID = req.params.id
    schema.pet.findById(petID).then((docs, err) => {
        if (err || !docs) { 
            res.json(errors.internalError).status(500) 
        }
        else { res.json(docs) }
    })
})

// Add new pet
router.post('/add', upload.array('images'), processImagesAndUpload, (req, res) => {
    const newPet = new schema.pet(req.body)
    newPet.save()
        .then(docs => res.json(docs))
        .catch(err => {
            res.status(500).json({ err })
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
router.post('/edit/:id', upload.array('images'), processImagesAndUpload, (req, res) => {
    schema.pet.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true })
        .then(doc => { res.json(doc) })
        .catch(err => { res.status(500).json({ error: 'Internal Server Error' }) })
})

export default router