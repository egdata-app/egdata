export type RequirementsPlatform = "windows" | "macos";

export type RequirementsState =
  | "pending"
  | "in_progress"
  | "normalized"
  | "inherited"
  | "empty"
  | "stale"
  | "failed"
  | "unknown";

export type RequirementTier = Record<string, unknown>;

export interface OfferRequirementsResult {
  namespace: string;
  offerId: string;
  platform: RequirementsPlatform;
  offerType: "BASE_GAME" | "DLC";
  inherited: boolean;
  isInherited: boolean;
  parentOfferId: string | null;
  parent: {
    namespace: string | null;
    offerId: string | null;
    relationshipType: string | null;
  } | null;
  state: RequirementsState;
  sourceGeneration: number;
  observedAt: string;
  requirements: {
    minimum: RequirementTier | null;
    recommended: RequirementTier | null;
  };
}

export interface OfferRequirements {
  windows: OfferRequirementsResult | null;
  macos: OfferRequirementsResult | null;
}
