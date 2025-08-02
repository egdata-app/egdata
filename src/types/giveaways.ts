import type { SingleItem } from './single-item';
import type { SingleOffer } from './single-offer';

export interface GiveawayOffer extends SingleOffer {
  giveaway: {
    _id: string;
    id: string;
    namespace: string;
    startDate: string;
    endDate: string;
    historical: {
      _id: string;
      id: string;
      namespace: string;
      startDate: string;
      endDate: string;
    }[];
  };
  items: SingleItem[];
}
