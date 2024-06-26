import { Router, NextFunction, Response, Request } from "express"
import multer from "multer"
import AWS from "aws-sdk"
import sharp from "sharp"
import dotenv from "dotenv"
import schema from "../models/index"
import utils, { WHSendMessage } from "../lib/utils"
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

router.get("/", async (req, res) => {
    try {
        const pets = await schema.pet.find({})
        WHSendMessage("info", "All pets fetched", "```" + `Total pets: ${pets.length}` + "```")
        res.json(pets)
    } catch (err) {
        console.error(err)
        WHSendMessage("error", "Failed to fetch all pets", "```" + err + "```")
        res.status(500).json({ msg: "internal" })
    }
})

// Add new pet
router.post("/add", utils.middlewares.requireAuth, upload.array("images"), processImagesAndUpload, async (req, res) => {
    const newPet = new schema.pet(req.body)
    newPet.save()
        .then(docs => {
            WHSendMessage("info", "New pet added", "```" + JSON.stringify(docs) + "```")
            res.json(docs)
        })
        .catch(err => {
            WHSendMessage("error", "Failed to add new pet", "```" + err + "```")
            console.error(err)
            res.status(500).json({ msg: "internal" })
        })
})


router.get("/:id", async (req, res) => {
    const petID = req.params.id
    try {
        const pet = await schema.pet.findById(petID)
        WHSendMessage("info", "Someone is looking at " + pet?.name, "```" + JSON.stringify(pet) + "```")
        res.json(pet)
    } catch (err) {
        console.error(err)
        WHSendMessage("error", "Failed to fetch pet", "```" + err + "```")
        res.status(500).json({ msg: "internal" })
    }
})

// Remove existing pet
router.delete("/:id", utils.middlewares.requireAuth, async (req, res) => {
    try {
        await schema.pet.findByIdAndDelete(req.params.id)
        WHSendMessage("info", "Pet removed", "```" + req.params.id + "```")
        res.json({ message: "Pet removed successfully" })
    } catch (err) {
        WHSendMessage("error", "Failed to remove pet", "```" + err + "```")
        console.error(err)
        res.status(500).json({ msg: "internal" })
    }
})

// Edit existing pet
router.post("/:id", utils.middlewares.requireAuth, upload.array("images"), processImagesAndUpload, async (req, res) => {
    try {
        const updatedPet = await schema.pet.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true })
        WHSendMessage("info", "Pet updated", "```" + JSON.stringify(req.params.id) + "```")
        res.json(updatedPet)
    } catch (err) {
        WHSendMessage("error", "Failed to update pet", "```" + err + "```")
        console.error(err)
        res.status(500).json({ msg: "internal" })
    }
})




export default router