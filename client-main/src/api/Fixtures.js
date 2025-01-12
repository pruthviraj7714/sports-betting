import axios from "../utils/axiosConfig";

export const getFixtures = async ({page,search,sortBy,sortOrder}) => {
  const { data } = await axios.get(`/fixture/get-all-fixtures?page=${page}&search=${search}&sortBy=${sortBy}&sortOrder=${sortOrder}`);
  return data;
};