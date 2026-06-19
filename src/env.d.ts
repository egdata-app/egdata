/// <reference types="@rsbuild/core/types" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_SERVER_API_ENDPOINT?: string;
  readonly VITE_VAPID_PUBLIC_KEY: string;
}
