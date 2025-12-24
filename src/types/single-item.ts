import type { KeyImage } from "./single-offer";

export interface SingleItem {
  _id: string;
  id: string;
  namespace: string;
  title: string;
  description: string;
  keyImages: KeyImage[];
  categories: Category[];
  status: string;
  creationDate: string;
  lastModifiedDate: string;
  customAttributes: CustomAttributes;
  entitlementName: string;
  entitlementType: string;
  itemType: string;
  releaseInfo: {
    id: string;
    appId: string;
    platform: string[];
  }[];
  developer: string;
  developerId: string;
  eulaIds: string[];
  installModes: any[];
  endOfSupport: boolean;
  applicationId: string;
  unsearchable: boolean;
  requiresSecureAccount: boolean;
}

export interface Category {
  path: string;
}

export interface CustomAttributes {
  [key: string]: {
    type: string;
    value: string;
  };
}
