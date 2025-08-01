import { createServerFn } from '@tanstack/react-start';

export interface Release {
  url: string;
  assets_url: string;
  upload_url: string;
  html_url: string;
  id: number;
  author: Author;
  node_id: string;
  tag_name: string;
  target_commitish: string;
  name: string;
  draft: boolean;
  immutable: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string;
  assets: Asset[];
  tarball_url: string;
  zipball_url: string;
  body: string;
  mentions_count?: number;
}

export interface Author {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  user_view_type: string;
  site_admin: boolean;
}

export interface Asset {
  url: string;
  id: number;
  node_id: string;
  name: string;
  label: string;
  uploader: Uploader;
  content_type: string;
  state: string;
  size: number;
  digest: string;
  download_count: number;
  created_at: string;
  updated_at: string;
  browser_download_url: string;
}

export interface Uploader {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  user_view_type: string;
  site_admin: boolean;
}

interface SimplifiedReleases {
  id: number;
  tag_name: string;
  name: string;
  published_at: string;
  assets: {
    id: number;
    name: string;
    download_url: string;
    size: number;
  }[];
}
[];

const repo = 'egdata-app/egdata-client';

/**
 * 1 hour
 */
const CACHE_TTL = 1000 * 60 * 60;
const cache: {
  timestamp: string;
  releases: SimplifiedReleases[];
}[] = [];

export const getGithubReleases = createServerFn().handler(async () => {
  const apiUrl = `https://api.github.com/repos/${repo}/releases`;

  const cached = cache.find((item) => {
    return Date.now() - new Date(item.timestamp).getTime() < CACHE_TTL;
  });

  if (cached) {
    return cached.releases;
  }

  try {
    const response = await fetch(apiUrl, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { error: 'Repository not found. Please check the URL.' };
      }
      const errorData = await response.json();
      return { error: `GitHub API error: ${errorData.message}` };
    }

    const releases = (await response.json()) as Release[];

    const simplifiedReleases = releases.map((release) => ({
      id: release.id,
      tag_name: release.tag_name,
      name: release.name,
      published_at: release.published_at,
      assets: release.assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        download_url: asset.browser_download_url,
        size: asset.size,
      })),
    }));

    cache.push({
      timestamp: new Date().toISOString(),
      releases: simplifiedReleases,
    });

    return simplifiedReleases;
  } catch (error) {
    console.error('Failed to fetch from GitHub API:', error);
    return { error: 'An internal server error occurred.' };
  }
});
