import consola from "consola";
import { useEffect } from "react";

export interface ConsentSettings {
  ad_storage: string;
  ad_user_data: string;
  ad_personalization: string;
  analytics_storage: string;
  functionality_storage: string;
  personalization_storage: string;
  security_storage: string;
}

interface GoogleAnalyticsProps {
  tagId: string;
  consentSettings: {
    ad_storage: string;
    ad_user_data: string;
    ad_personalization: string;
    analytics_storage: string;
    functionality_storage: string;
    personalization_storage: string;
    security_storage: string;
  };
}

export const GoogleAnalytics: React.FC<GoogleAnalyticsProps> = ({ tagId, consentSettings }) => {
  useEffect(() => {
    if (!tagId) {
      console.warn("GoogleAnalytics: No tag ID provided");
      return;
    }

    // Inject the Google Tag script dynamically
    const existingScript = document.querySelector(
      `script[src="https://www.googletagmanager.com/gtag/js?id=${tagId}"]`,
    );
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = `https://www.googletagmanager.com/gtag/js?id=${tagId}`;
      script.async = true;
      document.head?.appendChild(script);
    }

    const inlineScriptId = `google-analytics-script-${tagId}`;
    if (!document.getElementById(inlineScriptId)) {
      const script = document.createElement("script");
      script.id = inlineScriptId;
      script.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('consent', 'default', {
          ad_storage: '${consentSettings.ad_storage}',
          ad_user_data: '${consentSettings.ad_user_data}',
          ad_personalization: '${consentSettings.ad_personalization}',
          analytics_storage: '${consentSettings.analytics_storage}',
          functionality_storage: '${consentSettings.functionality_storage}',
          personalization_storage: '${consentSettings.personalization_storage}',
          security_storage: '${consentSettings.security_storage}',
        });
        gtag('js', new Date());
        gtag('config', '${tagId}');
      `;
      document.head?.appendChild(script);
      consola.info("GoogleAnalytics: Loaded inline script", tagId);
    }
  }, [tagId, consentSettings]);

  return null;
};
