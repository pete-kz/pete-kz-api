import passport from "passport"
import bcrypt from "bcrypt"
import { Strategy as LocalStrategy } from "passport-local"
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt"
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
            return done(null, false, { message: "No user found with that phone number." })
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return done(null, false, { message: "Password is incorrect." })
        }

        return done(null, user)
    } catch (error) {
        return done(error)
    }
}))

passport.use("jwt-refresh", new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromBodyField("refreshToken"),
    secretOrKey: process.env.REFRESH_TOKEN_SECRET!,
    passReqToCallback: true,
}, async (req, jwtPayload, done) => {
    try {
        const user = await schema.user.findById(jwtPayload._id)

        if (!user || user.refreshToken !== req.body.refreshToken) {
            return done(null, false, { message: "Invalid refresh token." })
        }
        return done(null, user)
    } catch (error) {
        return done(error)
    }
}))

export default passport
