import { Schema, model, InferSchemaType } from "mongoose"

// Pet's schema
const petSchema = new Schema({
    name: { type: String },
    address: { type: String },
    birthDate: { type: String },
    type: { type: String },
    sterilized: { type: Boolean },
    sex: { type: String, enum: ["male", "female"] },
    weight: { type: Number, default: 0 },
    breed: { type: String, default: "" },
    description: { type: String, default: "" }, 
    ownerID: { type: Schema.Types.ObjectId, ref: "User" },
    imagesPath: [{ type: String }],
    city: { type: String },
    price: { type: Number, default: 0 },
}, { timestamps: true })
type petSchema = InferSchemaType<typeof petSchema>

// User's schema
const userSchema = new Schema({
    companyName: { type: String, default: "" },
    address: { type: String, default: "" },
    showAddress: { type: Boolean, default: false },
    firstName: { type: String },
    lastName: { type: String },
    aboutMe: { type: String },
    phone: { type: String, unique: true },
    type: { type: String, enum: ["private", "shelter", "breeder", "nursery"], default: "private" }, 
    social: {
        telegram: { type: String, default: "" },
        instagram: { type: String, default: "" },
    },
    password: { type: String, default: "" },
    liked: { type: [{ type: Schema.Types.ObjectId, ref: "Pet" }], default: [] },
    token: { type: String, default: "" },
    refreshToken: { type: String, default: "" }
}, { timestamps: true })
type userSchema = InferSchemaType<typeof userSchema>

export { type userSchema, type petSchema } 
export default {
    user: model("User", userSchema),
    pet: model("Pet", petSchema)
}
