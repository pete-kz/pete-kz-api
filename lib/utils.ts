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
    [key: string]: (req: Request, res: Response, next: NextFunction) => Promise<void>
  },
  getPaginatedSortedPets: (filters: Filter, page: number, limit: number, authHeader: string | undefined) => Promise<petSchema[]>
}

export async function checkAuth({ authHeader, onSuccess, onFail }: { authHeader: string | undefined, onSuccess: () => void, onFail: () => void }) {
  // Reserving variable for token
  let token
  // Get received token
  if (authHeader) {
    token = authHeader.split(" ")[1]
  }
  // Token exists then validate to provide access or not
  if (token && !validator.isEmpty(token)) {
    try {
      // Validate token with the secret
      const decodedToken = jwt.verify(token, process.env.SECRET as string)
      // Check if the token belongs to a valid user
      const user = await schema.user.findById(typeof decodedToken === "string" ? decodedToken : decodedToken._id)
      // If the user is not found, return an error
      if (!user) {
        onFail()
        return
      }
      onSuccess()
    } catch (err) {
      console.error(err)
      onFail()
    }
  } else {
    onFail()
  }
}

export default <utils>{
  middlewares: {
    requireAuth: async (req, res, next) => {
      // Retrieve token from header
      const authorizationHeader = req.headers["authorization"]
      await checkAuth({
        authHeader: authorizationHeader,
        onSuccess: next,
        onFail: () => {
          res.status(401).json({ msg: "noAuth" })
          res.end()
        }
      })
    }
  },
  getPaginatedSortedPets: async (filters, page = 1, limit = 10, authHeader) => {
    const skip = (page - 1) * limit
    let allPets = await schema.pet.find({})
    const allUsers = await schema.user.find({})

    // if authheader exists, get the user and then filter pets from user's pets and liked pets
    if (authHeader) {
      // get the token from the header
      const token = authHeader.split(" ")[1]
      // find the user by token
      const user = await schema.user.findOne({ token })
      // if user exists, filter pets from user's pets and liked pets
      if (user) {
        allPets = allPets.filter(pet => pet.ownerID !== user._id)
        allPets = allPets.filter(pet => !user.liked.includes(pet._id))
      }
    }

    // Initialize a map to count likes for each pet
    const likesCount = new Map()

    // Populate the map with the count of likes for each pet
    allUsers.forEach(user => {
      user.liked.forEach(petId => {
        likesCount.set(petId, (likesCount.get(petId) || 0) + 1)
      })
    })

    function matchFilters(pet: petSchema) {
      if (filters.type && filters.type !== "" && pet.type !== filters.type) return false
      if (filters.sterilized !== undefined && filters.sterilized !== false && pet.sterilized !== filters.sterilized) return false
      if (filters.sex && pet.sex !== filters.sex) return false
      if (filters.weight && filters.weight !== 0 && pet.weight !== filters.weight) return false
      if (filters.owner_type && filters.owner_type !== "") {
        const owner = allUsers.find(user => user._id.toString() === pet.ownerID!.toString())
        if (!owner || owner.type !== filters.owner_type) return false
      }
      return true
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