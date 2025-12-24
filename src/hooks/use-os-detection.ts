import { useState, useEffect } from "react";

export type OS = "Windows" | "macOS" | "Linux" | "Other";
export type Arch = "Apple Silicon" | "Intel" | "Other";

export type DetectedOS = {
  os: OS;
  arch: Arch;
};

export function useOSDetection(): DetectedOS {
  const [detected, setDetected] = useState<DetectedOS>({
    os: "Other",
    arch: "Other",
  });

  useEffect(() => {
    // This code runs only on the client
    const userAgent = window.navigator.userAgent.toLowerCase();
    const platform = (window.navigator as any).userAgentData?.platform || window.navigator.platform;
    const lowerPlatform = platform.toLowerCase();

    let currentOs: OS = "Other";
    if (lowerPlatform.startsWith("win") || userAgent.includes("win")) {
      currentOs = "Windows";
    } else if (lowerPlatform.startsWith("mac") || userAgent.includes("mac")) {
      currentOs = "macOS";
    } else if (lowerPlatform.startsWith("linux") || userAgent.includes("linux")) {
      currentOs = "Linux";
    }

    let currentArch: Arch = "Other";
    if (currentOs === "macOS") {
      // `userAgentData.architecture` is the most reliable way to detect Apple Silicon
      const architecture = (window.navigator as any).userAgentData?.architecture;
      if (architecture === "arm") {
        currentArch = "Apple Silicon";
      } else {
        // Fallback for browsers without userAgentData or for Intel-based Macs
        currentArch = "Intel";
      }
    }

    setDetected({ os: currentOs, arch: currentArch });
  }, []);

  return detected;
}
