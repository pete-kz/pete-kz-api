import { Router, NextFunction, Response, Request } from "express"
import multer from "multer"
import AWS from "aws-sdk"
import sharp from "sharp"
import dotenv from "dotenv"
import schema from "../models/index"
import utils, { Filter } from "../lib/utils"
import { PutObjectRequest } from "aws-sdk/clients/s3"

dotenv.config()

const router = Router()
const spacesEndpoint = new AWS.Endpoint(process.env.AWS_ENDPOINT as string)
const s3 = new AWS.S3({
    endpoint: spacesEndpoint,
    region: "fra1",
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
})

// Setup multer for in-memory storage
const upload = multer({
    limits: { fileSize: 15000000 },
    storage: multer.memoryStorage(),
})

// Process and upload images
const processImagesAndUpload: (req: Request, res: Response, next: NextFunction) => void = (req, res, next) => {
    if (!req.files) {
        return next() // Continue without processing if no files are uploaded
    }

    // Process each file using Sharp and upload to S3
    // @ts-expect-error 'req.files' is not defined
    const uploadPromises = req.files.map(async file => {
        const buffer = await sharp(file.buffer)
            .resize(1024) // Optional: Adjust size
            .jpeg({ quality: 80 }) // Optional: Adjust format and quality
            .toBuffer()
        const params: PutObjectRequest = {
            Bucket: process.env.BUCKET_NAME as string,
            Key: `images/pet/${Date.now().toString()}.${file.originalname.split(".")[1]}`,
            Body: buffer,
            ACL: "public-read",
            ContentType: "image/jpeg", // Change as needed
        }
        return await s3.upload(params).promise()
    })

    const uploadDomain = `https://${process.env.BUCKET_NAME}.${(process.env.AWS_ENDPOINT as string).replace("https://", "")}`

    Promise.all(uploadPromises)
        .then(results => {
            // Attach the S3 URLs to the request for further processing
            // @ts-expect-error 'results' is not defined
            req.body.imagesPath = results.map(result => result.Location.replace(uploadDomain, process.env.BUCKET_DOMAIN || uploadDomain))
            next()
        })
        .catch(err => {
            console.error(err)
            res.status(500).json({ error: err })
        })
}

router.get("/breeds", async (req, res) => {
    // Fetch all breeds from database divided by pet type
    try {
        const pets = await schema.pet.find({})
        const breeds: { [key: string]: string[] } = {}
        for (let i = 0; i < pets.length; i++) {
            const pet = pets[i]
            if (!breeds[pet.type as string]) {
                breeds[pet.type as string] = []
            }
            if (!breeds[pet.type as string].includes(pet.breed)) {
                breeds[pet.type as string].push(pet.breed)
            }
        }
        res.json(breeds)
    } catch (err) {
        console.error(err)
        res.status(500).json({ msg: "internal" })
    }
})

router.get("/recommendations", async (req, res) => {
    const page = parseInt(req.query.page as string) || 1 // Default to page 1 if not specified
    const limit = parseInt(req.query.limit as string) || 10 // Default to 10 items per page if not specified

    /* APPLYING FILTERS */

    // Extract and sanitize query parameters
    const { type, sterilized, sex, weight, owner_type } = req.query as { [key: string]: string | undefined }
    const filters: Filter = {} // TypeScript type annotation use 'const filters = {}' if not using TypeScript

    if (type) filters.type = type
    if (sterilized !== undefined) filters.sterilized = sterilized === "true" // Assuming boolean values are passed as 'true' or 'false' strings
    if (sex) filters.sex = sex as "male" | "female" | undefined
    if (weight) filters.weight = parseInt(weight as string) // Convert weight to integer, assuming direct comparison
    if (owner_type) filters.owner_type = owner_type

    /* FILTERING OUT LIKED BY USER OR OWNED BY THEM (IF POSSIBLE) */
    const authorizationHeader = req.headers["authorization"]

    try {
        // getPaginatedSortedPets is a utility function that fetches pets from the database
        const pets = await utils.getPaginatedSortedPets(filters, page, limit, authorizationHeader)
        res.json(pets)
    } catch (err) {
        console.error(err)
        res.status(500).json({ msg: "internal" })
    }
})


router.get("/", async (req, res) => {
    try {
        const pets = await schema.pet.find({})
        res.json(pets)
    } catch (err) {
        console.error(err)
        res.status(500).json({ msg: "internal" })
    }
})

// Add new pet
router.post("/add", utils.middlewares.requireAuth, upload.array("images"), processImagesAndUpload, async (req, res) => {
    const newPet = new schema.pet(req.body)
    newPet.save()
        .then(docs => res.json(docs))
        .catch(err => {
            console.error(err)
            res.status(500).json({ msg: "internal" })
        })
})


router.get("/:id", async (req, res) => {
    const petID = req.params.id
    try {
        const pet = await schema.pet.findById(petID)
        res.json(pet)
    } catch (err) {
        console.error(err)
        res.status(500).json({ msg: "internal" })
    }
})

// Remove existing pet
router.delete("/:id", utils.middlewares.requireAuth, async (req, res) => {
    try {
        await schema.pet.findByIdAndDelete(req.params.id)
        res.json({ message: "Pet removed successfully" })
    } catch (err) {
        console.error(err)
        res.status(500).json({ msg: "internal" })
    }
})

// Edit existing pet
router.post("/:id", utils.middlewares.requireAuth, upload.array("images"), processImagesAndUpload, async (req, res) => {
    try {
        const updatedPet = await schema.pet.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true })
        res.json(updatedPet)
    } catch (err) {
        console.error(err)
        res.status(500).json({ msg: "internal" })
    }
})




export default router