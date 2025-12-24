import consola from "consola";
import { useEffect } from "react";

interface AhrefsAnalyticsProps {
  tagId: string;
}

export const AhrefsAnalytics: React.FC<AhrefsAnalyticsProps> = ({ tagId }) => {
  useEffect(() => {
    if (!tagId) {
      consola.warn("AhrefsAnalytics: No tag ID provided");
      return;
    }

    const existingScript = document.querySelector(
      `script[src="https://analytics.ahrefs.com/analytics.js"]`,
    );

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://analytics.ahrefs.com/analytics.js";
      script.async = true;
      script.dataset.key = tagId; // Use dataset for data attributes

      // *** THIS IS THE KEY CHANGE: Append the script to the head or body ***
      document.head.appendChild(script); // Or document.body.appendChild(script);

      script.onload = () => {
        // Optional: Add a load event listener
        consola.info("AhrefsAnalytics: Loaded script", tagId);
      };

      script.onerror = (error) => {
        // Optional: Add an error event listener
        consola.error("AhrefsAnalytics: Error loading script", error);
      };
    } else {
      consola.info("AhrefsAnalytics: Script already exists", tagId); // Log if script already there
      (existingScript as HTMLElement).dataset.key = tagId; // Update the tagId if it changed
    }
  }, [tagId]);

  return null;
};
