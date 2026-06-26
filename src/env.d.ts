/// <reference types="@rsbuild/core/types" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_PULSE_LOGS_ENDPOINT?: string;
  readonly VITE_PULSE_PROJECT_ID?: string;
  readonly VITE_PULSE_PROJECT_KEY?: string;
  readonly VITE_PULSE_RELEASE?: string;
  readonly VITE_PULSE_TRACES_ENDPOINT?: string;
  readonly VITE_SERVER_API_ENDPOINT?: string;
  readonly VITE_VAPID_PUBLIC_KEY: string;
}
