import { httpClient } from "./http-client";

export type EpicAccountResponse = Root2[];

interface Root2 {
  accountId: string;
  displayName: string;
  preferredLanguage: string;
  linkedAccounts?: LinkedAccount[];
  avatarUrl?: {
    id: string;
    filename: string;
    variants: string[];
  };
}

interface LinkedAccount {
  identityProviderId: string;
  displayName: string;
}

export const getEpicAccount = async (accessToken: string, accountId: string) => {
  const url = new URL("https://api.epicgames.dev/epic/id/v2/accounts");
  url.searchParams.append("accountId", accountId);

  const response = (await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }).then((r) => r.json())) as EpicAccountResponse;

  return response[0];
};

export const getAccountFromDb = async (accessToken: string) => {
  return httpClient.get<EpicAccountResponse["0"]>("/auth", {
    retries: 0,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};
