export interface OfferPosition {
  _id: string;
  collectionId: string;
  offerId: string;
  position: number;
  timesInTop1: number;
  timesInTop5: number;
  timesInTop10: number;
  timesInTop20: number;
  timesInTop50: number;
  timesInTop100: number;
  previous: number;
  positions: Position[];
  lastUpdated: string;
  __v: number;
  name: string;
}

export interface Position {
  date: string;
  position: number;
  _id: string;
}
