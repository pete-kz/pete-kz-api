import mongoose from 'mongoose'

// Pet's schema
const petSchema = new mongoose.Schema({
    name: { type: String },
    age: { type: String },
    type: { type: String },
    sterilized: { type: Boolean },
    sex: { type: String, enum: ['male', 'female'] },
    weight: { type: Number, default: 0 },
    description: { type: String, default: '' }, 
    ownerID: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    imagesPath: [{ type: String }],
    city: { type: String },
}, { timestamps: true })

// User's schema
const userSchema = new mongoose.Schema({
    companyName: { type: String, default: '' },
    firstName: { type: String },
    lastName: { type: String },
    phone: { type: String, unique: true },
    type: { type: String, enum: ['private', 'shelter', 'breeder', 'nursery'], default: 'private' }, 
    social: {
        telegram: { type: String, default: '' },
        instagram: { type: String, default: '' },
    },
    password: { type: String, default: '' },
    liked: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pet' }], default: [] },
    token: { type: String, default: '' }
}, { timestamps: true })

export default {
    user: mongoose.model('User', userSchema),
    pet: mongoose.model('Pet', petSchema)
}