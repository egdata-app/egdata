import axios from "axios";
import type { SearchV2Response } from "@/types/search-v2";

export async function fetchSearchV2(params: Record<string, unknown>): Promise<SearchV2Response> {
  const { data } = await axios.get<SearchV2Response>("/your-new-search-endpoint", { params });
  return data;
}
