import mongoose from 'mongoose'

// Pet's schema
const petSchema = new mongoose.Schema({
    name: { type: String }, // name of the pet
    type: { type: String },
    description: { type: String, default: '' },
    userID: { type: String },
    imagePath: { type: String, default: '' },
    city: { type: String, default: '' }
})

// User's schema
const userSchema = new mongoose.Schema({
    login: { type: String, unique: true },
    password: { type: String, default: '' },
    token: { type: String, default: '' }
})

// Config schema
const configSchema = new mongoose.Schema({
    admins: { type: Array, default: []},
    name: { type: String, default: 'SafeZone Finder'},
    version: { type: String, default: 'v1.0.0'}
})

export default {
    user: mongoose.model('User', userSchema),
    pet: mongoose.model('Pet', petSchema),
    config: mongoose.model('Config', configSchema)
}