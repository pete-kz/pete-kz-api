import passport from "passport"
import bcrypt from "bcrypt"
import { Strategy as LocalStrategy } from "passport-local"
import schema from "./models"
import { config } from "dotenv"
config()

passport.use(new LocalStrategy({
    usernameField: "phone",
    passwordField: "password",
}, async (phone, password, done) => {
    try {
        const user = await schema.user.findOne({ phone })
        if (!user) {
            return done(null, false, { message: "userNotFound" })
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return done(null, false, { message: "wrongPassword" })
        }

        return done(null, user)
    } catch (error) {
        return done(error)
    }
}))

export default passport
