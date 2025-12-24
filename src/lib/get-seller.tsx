import { Link } from "@tanstack/react-router";

export function getSeller({
  developerDisplayName,
  publisherDisplayName,
  seller,
  customAttributes,
}: {
  developerDisplayName: string | undefined | null;
  publisherDisplayName: string | undefined | null;
  seller: string;
  customAttributes?: {
    [key: string]: {
      type: string;
      value: string;
    };
  };
}) {
  // Get developer name from customAttributes or fallback to developerDisplayName
  const developer =
    (customAttributes?.developerName?.value === "{}"
      ? undefined
      : customAttributes?.developerName?.value) ?? developerDisplayName;

  // If both developer and publisher display names are missing, return the seller
  if (!developer && !publisherDisplayName) {
    return seller;
  }

  // If developer and publisher display names are the same, return the developer
  if (developer === publisherDisplayName) {
    return developer;
  }

  // If there is no publisher display name, return the developer name only
  if (publisherDisplayName === null || publisherDisplayName === undefined) {
    return developer;
  }

  // Return a combination of developer and publisher display names
  return `${developer !== null && developer !== undefined ? `${developer} - ` : ""}${publisherDisplayName}`;
}

export function Seller({
  developerDisplayName,
  publisherDisplayName,
  seller,
  customAttributes,
}: {
  developerDisplayName: string | undefined | null;
  publisherDisplayName: string | undefined | null;
  seller: string;
  customAttributes?: {
    [key: string]: {
      type: string;
      value: string;
    };
  };
}) {
  // Get developer name from customAttributes or fallback to developerDisplayName
  const developer =
    (customAttributes?.developerName?.value === "{}"
      ? undefined
      : customAttributes?.developerName?.value) ?? developerDisplayName;

  // If both developer and publisher display names are missing, return the seller
  if (!developer && !publisherDisplayName) {
    return seller;
  }

  // If developer and publisher display names are the same, return the developer
  if (developer === publisherDisplayName) {
    return (
      <Link
        to={"/search"}
        search={{
          developerDisplayName: developer,
        }}
        className="underline underline-offset-4"
      >
        {developer}
      </Link>
    );
  }

  // If there is no publisher display name, return the developer name only
  if (publisherDisplayName === null || publisherDisplayName === undefined) {
    return (
      <Link
        to={"/search"}
        search={{
          developerDisplayName: developer,
        }}
        className="underline underline-offset-4"
      >
        {developer}
      </Link>
    );
  }

  // Return a combination of developer and publisher display names
  // return `${developer !== null && developer !== undefined ? `${developer} - ` : ''}${publisherDisplayName}`;
  return (
    <div className="flex flex-row items-center gap-1">
      <Link
        to={"/search"}
        search={{
          developerDisplayName: developer,
        }}
        className="underline underline-offset-4"
      >
        {developer}
      </Link>
      <span className="text-gray-400">-</span>
      <Link
        to={"/search"}
        search={{
          publisherDisplayName: publisherDisplayName,
        }}
        className="underline underline-offset-4"
      >
        {publisherDisplayName}
      </Link>
    </div>
  );
}
