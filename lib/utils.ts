import schema, { petSchema } from "../models/index"
import validator from "validator"
import jwt from "jsonwebtoken"
import { NextFunction, Response, Request } from "express"
export interface Filter {
  type?: string,
  sterilized?: boolean,
  sex?: "male" | "female",
  weight?: number,
  owner_type?: string
}

interface utils {
  middlewares: {
      [key: string]: (req: Request, res: Response, next: NextFunction) => void
  },
  getPaginatedSortedPets: (filters: Filter, page: number, limit: number) => Promise<petSchema[]>
}

export const utils: utils = {
  middlewares: {
      authenticate: (req, res, next) => {
          // Retrieve token from header
          const authorizationHeader = req.headers["authorization"]
          // Reserving variable for token
          let token
          // Get received token
          if (authorizationHeader) token = authorizationHeader.split(" ")[1]
          // Paths whitelist
          const pathWhitelist = ["pets/find", "pets/recommendations", "users/find", "users/login", "users/register"]
          // If path is whitelisted then proceed
          if (pathWhitelist.some(path => req.path.includes(path))) {
              next()
          }
          // Token exists then validate to provide access or not
            else if (token && !validator.isEmpty(token)) {
              // Validate token with the secret
              jwt.verify(token, process.env.SECRET as string, (err) => {
                if (err) {
                  res.status(401).json({ err: "Чтобы выполнить это действие, выполните вход." })
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
      }
  },
  getPaginatedSortedPets: async (filters: Filter, page = 1, limit = 10) => {
    const skip = (page - 1) * limit
    const allPets = await schema.pet.find({})
    const allUsers = await schema.user.find({})
  
    // Initialize a map to count likes for each pet
    const likesCount = new Map()
  
    // Populate the map with the count of likes for each pet
    allUsers.forEach(user => {
        user.liked.forEach(petId => {
            likesCount.set(petId, (likesCount.get(petId) || 0) + 1)
        })
    })
  
    function matchFilters(pet: petSchema) {
      let matchesFilter = true
      // Only apply filters if they differ from default values
      if (filters.type && filters.type !== "" && pet.type !== filters.type) matchesFilter = false
      if (filters.sterilized !== undefined && filters.sterilized !== false && pet.sterilized !== filters.sterilized) matchesFilter = false
      if (filters.sex && pet.sex !== filters.sex) matchesFilter = false
      if (filters.weight && filters.weight !== 0 && pet.weight !== filters.weight) matchesFilter = false
      if (filters.owner_type && filters.owner_type !== "") {
        const owner = allUsers.find(user => user._id.toString() === pet.ownerID!.toString())
        if (!owner || owner.type !== filters.owner_type) matchesFilter = false
      }
      return matchesFilter
    }
  
    const filteredPets = allPets.filter(matchFilters)
  
    // Sort pets by likes (from most liked to least liked)
    const sortedPets = filteredPets.sort((a, b) => {
        const likesA = likesCount.get(a._id.toString()) || 0
        const likesB = likesCount.get(b._id.toString()) || 0
        return likesB - likesA // Descending order
    })
  
    // Implement pagination
    const paginatedPets = sortedPets.slice(skip, skip + limit)
  
    return paginatedPets
  }
}