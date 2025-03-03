import { useEffect, useState } from "react";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";
import { getNationalTeams } from "../api/Country";
import { useQuery } from "@tanstack/react-query";
import { getCountries } from "../api/Country";
import Select from "react-select";

const EditPlayerModal = ({
  player,
  onClose,
  onUpdate,
  positionsData,
  clubsData,
  clubsDataLoading
}) => {
  const [selectedCountries, setSelectedCountries] = useState(
    player.nationalTeams?.map((team) => ({
      value: team.name,
      label: team.name,
    })) || []
  );

  // const {
  //   isLoading: positionsDataLoading,
  //   error: positionsDataError,
  //   data: positionsData,
  // } = useQuery({
  //   queryKey: ["positions"],
  //   queryFn: () => getPositions(),
  // });

  const {
    isLoading: countriesDataLoading,
    error: countriesDataError,
    data: countriesData,
  } = useQuery({
    queryKey: ["countries"],
    queryFn: () => getCountries(),
  });
  const formatDate = (dateString) => {
    if (!dateString) return "";
    return dateString.split("T")[0];
  };
  // Update the initial state to match your DB structure
  const [editedPlayer, setEditedPlayer] = useState({
    ...player,
    rating: player.rating || 1,
    position: player.position?._id || player.position,
    currentClub: {
      club: player.currentClub?.club || null,
      from: formatDate(player.currentClub?.from),
    },
    nationalTeams: player.nationalTeams?.map((team) => ({
      name: team.name || "",
      from: formatDate(team.from),
      type: team.type || "",
      to: formatDate(team.to),
      teams: [],
      disabled: false,
      currentlyPlaying: !team.to,
    })) || [
      {
        name: "",
        from: "",
        type: "",
        to: "",
        teams: [],
        disabled: true,
        currentlyPlaying: false,
      },
    ],
    previousClubs: (player.previousClubs || []).map((club) => ({
      name: club.name,
      from: formatDate(club.from),
      to: formatDate(club.to),
    })),
  });

  // Fetch national teams when a country is selected
  const fetchNationalTeams = async (country, index) => {
    try {
      console.log("Fetching teams for country:", country);
      const teams = await getNationalTeams(country);
      console.log("Received teams:", teams);

      // Make sure we're getting the correct team types
      const teamsArray = ["U-17", "U-19", "U-21", "A"]; // Use the fixed array of team types

      const updatedTeams = [...editedPlayer.nationalTeams];
      updatedTeams[index] = {
        ...updatedTeams[index],
        teams: teamsArray, // Set the available team types
        disabled: false,
      };

      setEditedPlayer((prevState) => ({
        ...prevState,
        nationalTeams: updatedTeams,
      }));
    } catch (error) {
      console.error("Error fetching national teams:", error);
      toast({
        variant: "destructive",
        description: "Failed to fetch national teams",
      });
    }
  };

  // Load existing national teams data on component mount
  useEffect(() => {
    const loadExistingNationalTeams = async () => {
      for (let i = 0; i < editedPlayer.nationalTeams.length; i++) {
        const team = editedPlayer.nationalTeams[i];
        if (team.name) {
          await fetchNationalTeams(team.name, i);
        }
      }
    };

    loadExistingNationalTeams();
  }, []);

  const handleInputChange = (field, value) => {
    setEditedPlayer({ ...editedPlayer, [field]: value });
  };

  const handleClubChange = (field, subfield, value) => {
    setEditedPlayer({
      ...editedPlayer,
      [field]: { ...editedPlayer[field], [subfield]: value },
    });
  };

  const handleNationalTeamChange = (index, field, value) => {
    console.log("Handling national team change:", { index, field, value });

    const updatedTeams = [...editedPlayer.nationalTeams];

    if (field === "name") {
      updatedTeams[index] = {
        ...updatedTeams[index],
        [field]: value,
        type: "", // Reset type when country changes
        teams: ["U-17", "U-19", "U-21", "A"], // Set available team types
        disabled: false, // Enable type selection
        from:
          updatedTeams[index].from || new Date().toISOString().split("T")[0],
      };

      // Update selected countries state
      const newSelectedCountries = [...selectedCountries];
      newSelectedCountries[index] = { value, label: value };
      setSelectedCountries(newSelectedCountries);
    } else if (field === "currentlyPlaying") {
      updatedTeams[index] = {
        ...updatedTeams[index],
        currentlyPlaying: value,
        to: value ? null : updatedTeams[index].to,
      };
    } else if (field === "type") {
      updatedTeams[index] = {
        ...updatedTeams[index],
        [field]: value,
        from:
          updatedTeams[index].from || new Date().toISOString().split("T")[0],
        teams: ["U-17", "U-19", "U-21", "A"], // Ensure team types are available
      };
    } else {
      updatedTeams[index] = {
        ...updatedTeams[index],
        [field]: value,
      };
    }

    console.log("Updated teams:", updatedTeams);

    setEditedPlayer((prevState) => ({
      ...prevState,
      nationalTeams: updatedTeams,
    }));
  };
  const handleAddNationalTeam = () => {
    console.log("Adding new national team");

    const newTeam = {
      name: "",
      from: new Date().toISOString().split("T")[0],
      to: "",
      type: "",
      teams: ["U-17", "U-19", "U-21", "A"], // Add available team types
      disabled: true,
      currentlyPlaying: false,
    };

    setEditedPlayer((prevState) => ({
      ...prevState,
      nationalTeams: [...prevState.nationalTeams, newTeam],
    }));

    // Update selected countries state
    setSelectedCountries((prev) => [...prev, null]);

    console.log("Updated player after adding team:", editedPlayer);
  };
  // When selecting a country
  const handleCountrySelect = (option, index) => {
    handleNationalTeamChange(index, "name", option.label);
    // Ensure from date is set
    if (!editedPlayer.nationalTeams[index].from) {
      handleNationalTeamChange(
        index,
        "from",
        new Date().toISOString().split("T")[0]
      );
    }
  };
  const handleAddPreviousClub = () => {
    setEditedPlayer({
      ...editedPlayer,
      previousClubs: [
        ...editedPlayer.previousClubs,
        { name: "", from: "", to: "" },
      ],
    });
  };
  useEffect(() => {
    console.log("Player data:", player);
    console.log("Current club data:", player.currentClub);
  }, [player]);
  // console.log('ClubsData available:', clubsData);
  // console.log('Current club ID we are looking for:', editedPlayer.currentClub.club);
  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Edit Player
        </h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onUpdate(editedPlayer);
          }}
          className="space-y-6"
        >
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="font-semibold text-gray-700">Name:</label>
              <Input
                value={editedPlayer.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
            </div>

            <div className="flex flex-col">
              <label className="font-semibold text-gray-700">
                Date of Birth:
              </label>
              <Input
                type="date"
                value={editedPlayer.dateOfBirth?.split("T")[0]}
                onChange={(e) =>
                  handleInputChange("dateOfBirth", e.target.value)
                }
              />
            </div>

            <div className="flex flex-col">
              <label className="font-semibold text-gray-700">Position:</label>
              <Select
                value={
                  editedPlayer.position
                    ? {
                        value: editedPlayer.position,
                        label: positionsData?.find(
                          (p) => p._id === editedPlayer.position
                        )?.position,
                      }
                    : null
                }
                onChange={(option) =>
                  handleInputChange("position", option.value)
                }
                options={
                  positionsData?.map((p) => ({
                    value: p._id, // Use the position ID as value
                    label: p.position, // Use the position name as label
                  })) || []
                }
              />
            </div>
          </div>

          {/* Current Club */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700">Current Club</h3>
            <Select
              value={
                editedPlayer.currentClub.club && clubsData
                  ? {
                      value: editedPlayer.currentClub.club,
                      label:
                        clubsData.find(
                          (c) => c._id === editedPlayer.currentClub.club
                        )?.name || "Club not found",
                    }
                  : null
              }
              onChange={(option) =>
                handleClubChange("currentClub", "club", option.value)
              }
              options={
                clubsData?.map((club) => ({
                  value: club._id,
                  label: club.name,
                })) || []
              }
              isLoading={clubsDataLoading}
              placeholder="Select a club"
              className="w-full"
              noOptionsMessage={() => "No clubs found"}
            />
            <Input
              type="date"
              value={editedPlayer.currentClub.from?.split("T")[0]}
              onChange={(e) =>
                handleClubChange("currentClub", "from", e.target.value)
              }
            />
          </div>

          {/* National Teams */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-700">National Teams</h3>
              <Button type="button" onClick={handleAddNationalTeam}>
                Add Team
              </Button>
            </div>
            <div className="space-y-4">
              {editedPlayer.nationalTeams.map((team, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <Select
                    value={selectedCountries[index] || null}
                    onChange={(option) => handleCountrySelect(option, index)} // Changed this line
                    options={
                      countriesData?.map((country) => ({
                        label:
                          country.name,
                        value:country._id,
                      })) || []
                    }
                    placeholder="Select Country"
                  />

                  <Select
                    value={
                      team.type ? { label: team.type, value: team.type } : null
                    }
                    onChange={(option) =>
                      handleNationalTeamChange(index, "type", option.value)
                    }
                    options={["U-17", "U-19", "U-21", "A"].map((type) => ({
                      value: type,
                      label: type,
                    }))}
                    isDisabled={!team.name} // Only disable if no country is selected
                    placeholder="Select Team Type"
                  />
                  <div className="flex gap-4">
                    <Input
                      type="date"
                      value={team.from}
                      onChange={(e) =>
                        handleNationalTeamChange(index, "from", e.target.value)
                      }
                    />
                    {!team.currentlyPlaying && (
                      <Input
                        type="date"
                        value={team.to}
                        onChange={(e) =>
                          handleNationalTeamChange(index, "to", e.target.value)
                        }
                      />
                    )}
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={team.currentlyPlaying}
                      onChange={(e) =>
                        handleNationalTeamChange(
                          index,
                          "currentlyPlaying",
                          e.target.checked
                        )
                      }
                    />
                    Currently Playing
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Previous Clubs */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-700">Previous Clubs</h3>
              <Button type="button" onClick={handleAddPreviousClub}>
                Add Club
              </Button>
            </div>
            {editedPlayer.previousClubs.map((club, index) => (
              <div key={index} className="flex gap-4">
                <Select
                  className="w-full"
                  value={
                    club.name
                      ? {
                          value: club.name,
                          label: clubsData?.find((c) => c._id === club.name)
                            ?.name,
                        }
                      : null
                  }
                  onChange={(option) => {
                    const updatedClubs = [...editedPlayer.previousClubs];
                    updatedClubs[index].name = option.value;
                    setEditedPlayer({
                      ...editedPlayer,
                      previousClubs: updatedClubs,
                    });
                  }}
                  options={clubsData.map((c) => ({
                    value: c._id,
                    label: c.name,
                  }))}
                />
                <Input
                  type="date"
                  value={club.from}
                  onChange={(e) => {
                    const updatedClubs = [...editedPlayer.previousClubs];
                    updatedClubs[index].from = e.target.value;
                    setEditedPlayer({
                      ...editedPlayer,
                      previousClubs: updatedClubs,
                    });
                  }}
                />
                <Input
                  type="date"
                  value={club.to}
                  onChange={(e) => {
                    const updatedClubs = [...editedPlayer.previousClubs];
                    updatedClubs[index].to = e.target.value;
                    setEditedPlayer({
                      ...editedPlayer,
                      previousClubs: updatedClubs,
                    });
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="yellow">
              Update Player
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPlayerModal;
