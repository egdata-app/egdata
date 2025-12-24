import type { SingleOffer } from "./single-offer";

interface HasPrepurchaseBase {
  hasPrepurchase: true | false;
  offer: unknown;
}

interface HasPrepurchaseTrue extends HasPrepurchaseBase {
  hasPrepurchase: true;
  offer: SingleOffer;
}

interface HasPrepurchaseFalse extends HasPrepurchaseBase {
  hasPrepurchase: false;
  offer: never;
}

export type HasPrepurchase = HasPrepurchaseTrue | HasPrepurchaseFalse;

interface IsPrepurchaseBase {
  isPrepurchase: true | false;
  offer: unknown;
}

interface IsPrepurchaseTrue extends IsPrepurchaseBase {
  isPrepurchase: true;
  offer: SingleOffer;
}

interface IsPrepurchaseFalse extends IsPrepurchaseBase {
  isPrepurchase: false;
  offer: never;
}

export type IsPrepurchase = IsPrepurchaseTrue | IsPrepurchaseFalse;
