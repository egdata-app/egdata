import { getCollection } from "./collection";

export const getTopSellers = async (country: string) => {
  return getCollection({
    slug: "top-sellers",
    limit: 25,
    page: 1,
    country,
  }).then((res) => res.elements);
};
