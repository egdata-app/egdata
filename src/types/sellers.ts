export interface SingleSeller {
  _id?: string;
  id?: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  igdb_id: number | null;
  logo: Logo | null;
}

export interface Logo {
  _id: string;
  url: string;
  height: number;
  width: number;
  checksum: string;
  animated: boolean;
  alpha_channel: boolean;
}
