// controllers/Player.js
const Player = require("../models/Player");

module.exports = {
  async create(req, res) {
    const {
      name,
      dateOfBirth,
      position,
      currentClub,
      country,
      nationalTeams,
      previousClubs,
      rating,
    } = req.body;

    console.log("Creating player with name:", name, "DOB:", dateOfBirth);

    if (!name || !dateOfBirth || !position || !country) {
      console.log("Validation failed - missing required fields");
      return res.status(400).json({
        success: false,
        msg: "Name, date of birth, position, and country are required",
      });
    }

    try {
      // Validate date format
      const validDate = new Date(dateOfBirth);
      if (isNaN(validDate.getTime())) {
        console.log("Invalid date format:", dateOfBirth);
        return res.status(400).json({
          success: false,
          msg: "Invalid date format for date of birth",
        });
      }

      // Check for duplicate - use trim() to handle whitespace
      const normalizedName = name.trim();
      console.log(
        "Checking for duplicate with normalized name:",
        normalizedName
      );

      const existingPlayer = await Player.findOne({
        name: { $regex: new RegExp(`^${normalizedName}$`, "i") },
        dateOfBirth: new Date(dateOfBirth),
      });

      if (existingPlayer) {
        console.log("Duplicate player found:", existingPlayer._id);
        return res.status(400).json({
          success: false,
          msg: "A player with the same name and date of birth already exists",
        });
      }

      // Important: Add return statement here to prevent code from continuing
      // Create new player
      const player = await Player.create({
        name: normalizedName,
        dateOfBirth: new Date(dateOfBirth),
        position,
        currentClub,
        country,
        nationalTeams: nationalTeams?.map((team) => ({
          ...team,
          from: new Date(team.from),
          to: team.currentlyPlaying ? null : new Date(team.to),
        })),
        previousClubs: previousClubs?.map((club) => ({
          ...club,
          from: new Date(club.from),
          to: new Date(club.to),
        })),
        rating,
        ratings: [],
      });

      console.log("Successfully created player:", player._id);
      return res.status(201).json({
        success: true,
        data: player,
      });
    } catch (error) {
      console.error("Error creating player:", error);
      return res.status(500).json({
        success: false,
        msg: "Error creating player",
        error: error.message,
      });
    }
  },

  async checkDuplicate(req, res) {
    const { name, dateOfBirth } = req.query;

    if (!name || !dateOfBirth) {
      return res.status(400).json({
        success: false,
        msg: "Name and date of birth are required",
      });
    }

    try {
      const validDate = new Date(dateOfBirth);
      if (isNaN(validDate.getTime())) {
        return res.status(400).json({
          success: false,
          msg: "Invalid date format",
        });
      }

      const existingPlayer = await Player.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
        dateOfBirth: new Date(dateOfBirth),
      });

      return res.json({
        success: true,
        exists: !!existingPlayer,
      });
    } catch (error) {
      console.error("Error checking for duplicate:", error);
      return res.status(500).json({
        success: false,
        msg: "Error checking for duplicate player",
        error: error.message,
      });
    }
  },

  async updatePlayer(req, res) {
    try {
      const playerId = req.params.id;
      const { rating, matchDate, ...otherData } = req.body;

      console.log("Update request received for player:", playerId);
      console.log("Raw request body:", req.body);
      console.log("Extracted otherData:", otherData);
      console.log("Position being updated to:", otherData.position);
      let updateData = {
        ...otherData,
        dateOfBirth: new Date(otherData.dateOfBirth),
        nationalTeams: otherData.nationalTeams?.map((team) => {
          console.log("Processing national team:", team);
          const formattedTeam = {
            ...team,
            from: new Date(team.from),
            to: team.currentlyPlaying
              ? null
              : team.to
              ? new Date(team.to)
              : null,
          };
          console.log("Formatted national team:", formattedTeam);
          return formattedTeam;
        }),
      };

      console.log("Final updateData structure:", updateData);

      // If rating update is included, add to ratings array
      if (rating !== undefined && matchDate) {
        console.log("Adding new rating:", { rating, matchDate });
        updateData.$push = {
          ratings: {
            date: new Date(matchDate),
            rating: Number(rating),
          },
        };
      }

      console.log("Executing findByIdAndUpdate with:", {
        id: playerId,
        updateData: JSON.stringify(updateData, null, 2),
      });

      const player = await Player.findByIdAndUpdate(playerId, updateData, {
        new: true,
        runValidators: true,
      })
        .populate("position")
        .populate("country")
        .populate("currentClub.club");

      if (!player) {
        console.log("Player not found with ID:", playerId);
        return res.status(404).json({
          success: false,
          message: "Player not found",
        });
      }

      console.log("Successfully updated player:", {
        id: player._id,
        nationalTeams: player.nationalTeams,
        updatedAt: player.updatedAt,
      });

      res.json({
        success: true,
        data: player,
      });
    } catch (error) {
      console.error("Update error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      if (error.name === "ValidationError") {
        console.log("Validation error details:", error.errors);
      }
      if (error.name === "CastError") {
        console.log("Cast error details:", {
          kind: error.kind,
          path: error.path,
          value: error.value,
        });
      }
      res.status(500).json({
        success: false,
        message: "Error updating player",
        error: error.message,
        errorType: error.name,
      });
    }
  },

  async fetchAllPlayers(req, res) {
    try {
      const {
        page = 1,
        perPage = 10,
        search = "",
        sortBy = "name",
        sortOrder = "asc",
        filter,
        ageGroup = null,
        position = null,
      } = req.query;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(perPage, 10);

      let sortField = sortBy;
      if (sortBy === "club") {
        sortField = "clubDetails.name";
      }

      const sortOptions = {};
      sortOptions[sortField] = sortOrder === "asc" ? 1 : -1;

      const matchConditions = {
        name: { $regex: search, $options: "i" },
      };

      if (filter === "true") {
        const ageGroupMap = {
          under20: { $lt: 20 },
          under22: { $lt: 22 },
          under26: { $lt: 26 },
          under30: { $lt: 30 },
        };

        if (ageGroup && ageGroupMap[ageGroup]) {
          matchConditions.age = ageGroupMap[ageGroup];
        }

        if (position) {
          matchConditions["positionDetails.position"] =
            decodeURIComponent(position);
        }
      }

      const pipeline = [
        {
          $addFields: {
            age: {
              $floor: {
                $divide: [
                  { $subtract: [new Date(), "$dateOfBirth"] },
                  365 * 24 * 60 * 60 * 1000,
                ],
              },
            },
          },
        },
        {
          $addFields: {
            rating: {
              $reduce: {
                input: "$ratingHistory",
                initialValue: 0,
                in: { $add: ["$$value", "$$this.newRating"] },
              },
            },
            netRating: {
              $reduce: {
                input: "$ratingHistory",
                initialValue: 0,
                in: { $add: ["$$value", "$$this.netRating"] },
              },
            },
          },
        },
        {
          $lookup: {
            from: "clubteams",
            localField: "currentClub.club",
            foreignField: "_id",
            as: "clubDetails",
          },
        },
        { $unwind: { path: "$clubDetails", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "countries",
            localField: "country",
            foreignField: "_id",
            as: "countryDetails",
          },
        },
        { $unwind: { path: "$countryDetails", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "positions",
            localField: "position",
            foreignField: "_id",
            as: "positionDetails",
          },
        },
        {
          $unwind: {
            path: "$positionDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: matchConditions,
        },
        { $sort: sortOptions },
        { $skip: (pageNum - 1) * limitNum },
        { $limit: limitNum },
      ];
      
      const totalPipeline = [
        {
          $addFields: {
            age: {
              $floor: {
                $divide: [
                  { $subtract: [new Date(), "$dateOfBirth"] },
                  365 * 24 * 60 * 60 * 1000,
                ],
              },
            },
          },
        },
        {
          $lookup: {
            from: "positions",
            localField: "position",
            foreignField: "_id",
            as: "positionDetails",
          },
        },
        {
          $unwind: {
            path: "$positionDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: matchConditions,
        },
        {
          $count: "total",
        },
      ];  

      const [players, totalPlayers] = await Promise.all([
        Player.aggregate(pipeline),
        Player.aggregate(totalPipeline),
      ]);
      

      const total = totalPlayers[0]?.total;

      return res.status(200).json({
        players,
        total: total,
        page: pageNum,
        perPage: limitNum,
      });
    } catch (error) {
      console.error("error while fetching players:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      res.status(500).json({
        success: false,
        message: "Error fetching players",
        error: error.message,
        errorType: error.name,
      });
    }
  },
};
