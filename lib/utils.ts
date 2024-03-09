import schema from '../models/index.js'

export const getPaginatedSortedPets = async (filters = {}, page = 1, limit = 10) => {
    const skip = (page - 1) * limit

    const matchStage = {
      $match: {
        // ...filters.type && { type: filters.type },
        ...filters.sterilized && { sterilized: filters.sterilized  },
        // ...filters.sex && { sex: filters.sex },
        // For weight, assuming you want pets that are at least of the specified weight
        // ...filters.weight && { weight: { $gte: parseFloat(filters.weight) } },
        // ...filters.owner_type && { owner_type: filters.owner_type },
      },
    }
    console.log(matchStage)
    const aggregationPipeline = [
      Object.keys(matchStage.$match).length > 0 ? matchStage : null,
      {
        $lookup: {
          from: "users", // Assuming 'users' is the collection name of User model
          localField: "_id", // The pet ID field on the Pet document
          foreignField: "liked", // The field in the User document containing liked pet IDs
          as: "likesInfo", // The array containing the joined User documents
        }
      },
      {
        $unwind: "$likesInfo" // Unwind the likesInfo array for counting
      },
      {
        $group: {
          _id: "$_id", // Group by the pet ID
          doc: { $first: "$$ROOT" }, // Preserve the original Pet document
          likesCount: { $sum: 1 } // Count the likes per pet
        }
      },
      {
        $addFields: {
          "doc.likesCount": "$likesCount" // Add the likesCount to the original document
        }
      },
      {
        $replaceRoot: { newRoot: "$doc" } // Replace the root to return the original document structure
      },
      {
        $sort: { "likesCount": -1 } // Sort the documents by likesCount in descending order
      },
      {
        $skip: skip // Pagination: Skip documents
      },
      {
        $limit: limit // Pagination: Limit the number of documents
      }
    ].filter(stage => stage !== null)
  
    return schema.pet.aggregate(aggregationPipeline)
  }
  