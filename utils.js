
import validator from 'validator'
import jwt from 'jsonwebtoken'

export default {
    middlewares: {
        
        authenticate: (req, res, next) => {
            // Retrieve token from header
            const authorizationHeader = req.headers['authorization']
            // Reserving variable for token
            let token
            // Get received token
            if (authorizationHeader) token = authorizationHeader.split(' ')[1]
            // Paths whitelist
            const pathsWhitelists = ['/users/login', '/users/register', '/users/find']
            // Bypass authorization middleware if path includes "auth" or it ends with api (for testing purposes)
            if (pathsWhitelists.includes(req.path)) {
                next()
            }
            // Token exists then validate to provide access or not
            else if (token && !validator.isEmpty(token)) {
                // Validate token with the secret
                jwt.verify(token, process.env.SECRET, (err, decoded) => {
                    if (err) {
                        res.status(401).json({ err: 'Чтобы выполнить это действие, выполните вход.' })
                        res.end()
                    } else {
                        // Suggest - You can check database here if you want to save it
                        
                        next() // Let de request proceed to it's endpoint naturally
                    }
                })
            } else {
                res.status(401).json({ err: "Неавторизованы! Чтобы выполнить это действие, выполните вход." })
                res.end()
            }
        },
        
        logger: (req, res, next) => {
            console.log(req.ip, req.method, req.originalUrl)
            next()
        }
    }

}