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
  getPaginatedSortedPets: (filters: Filter, page: number, limit: number) => Promise<petSchema[]>
}

export default <utils>{
  middlewares: {
    requireAuth: async (req, res, next) => {
      // Retrieve token from header
      const authorizationHeader = req.headers["authorization"]
      // Reserving variable for token
      let token
      // Get received token
      if (authorizationHeader) {
        token = authorizationHeader.split(" ")[1]
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
            res.status(401).json({ msg: "noAuth" })
            res.end()
            return
          }
          next() // Let the request proceed to its endpoint naturally
        } catch (err) {
          console.error(err)
          res.status(401).json({ msg: "noAuth" })
          res.end()
        }
      } else {
        res.status(401).json({ msg: "noAuth" })
        res.end()
      }
    }
  },
  getPaginatedSortedPets: async (filters: Filter, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    const allPets = await schema.pet.find({});
    const allUsers = await schema.user.find({});

    // Initialize a map to count likes for each pet
    const likesCount = new Map();

    // Populate the map with the count of likes for each pet
    allUsers.forEach(user => {
      user.liked.forEach(petId => {
        likesCount.set(petId, (likesCount.get(petId) || 0) + 1);
      });
    });

    function matchFilters(pet: petSchema) {
      if (filters.type && filters.type !== "" && pet.type !== filters.type) return false;
      if (filters.sterilized !== undefined && filters.sterilized !== false && pet.sterilized !== filters.sterilized) return false;
      if (filters.sex && pet.sex !== filters.sex) return false;
      if (filters.weight && filters.weight !== 0 && pet.weight !== filters.weight) return false;
      if (filters.owner_type && filters.owner_type !== "") {
        const owner = allUsers.find(user => user._id.toString() === pet.ownerID!.toString());
        if (!owner || owner.type !== filters.owner_type) return false;
      }
      return true;
    }

    const filteredPets = allPets.filter(matchFilters);

    // Sort pets by likes (from most liked to least liked)
    const sortedPets = filteredPets.sort((a, b) => {
      const likesA = likesCount.get(a._id.toString()) || 0;
      const likesB = likesCount.get(b._id.toString()) || 0;
      return likesB - likesA; // Descending order
    });

    // Implement pagination
    const paginatedPets = sortedPets.slice(skip, skip + limit);

    return paginatedPets;
  }
}