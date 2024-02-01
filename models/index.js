import mongoose from 'mongoose'

// Pet's schema
const petSchema = new mongoose.Schema({
    name: { type: String }, // name of the pet
    age: { type: String },
    type: { type: String, enum: ['Cat', 'Dog', 'Other'] },
    description: { type: String, default: '' }, // short description of pet
    userID: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    imagesPath: [{ type: String }],
    city: { type: String, default: '' },
    datePublished: { type: Date, default: Date.now }
}, { timestamps: true })

// User's schema
const userSchema = new mongoose.Schema({
    login: { type: String, unique: true },
    social: {
        telegram: { type: String, default: '' },
        instagram: { type: String, default: '' },
        phone: { type: String, unique: true }
    },
    password: { type: String, default: '' },
    liked: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pet' }], default: [] },
    skipped: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pet' }], default: [] },
    token: { type: String, default: '' }
}, { timestamps: true })

// Config schema
const configSchema = new mongoose.Schema({
    admins: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: []},
    name: { type: String, default: 'Petinder'},
})

export default {
    user: mongoose.model('User', userSchema),
    pet: mongoose.model('Pet', petSchema),
    config: mongoose.model('Config', configSchema)
}