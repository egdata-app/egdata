import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/fair-use")({
  component: () => (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Fair Use Policy for EGData App</h1>

      <h2 className="text-2xl font-semibold mb-2">1. Introduction</h2>
      <p className="mb-4">
        Welcome to EGData App ("we", "our", "us"). This Fair Use Policy outlines the terms under
        which you may use the content and data provided on our website{" "}
        <a href="https://egdata.app" className="text-blue-500">
          https://egdata.app
        </a>{" "}
        (the "Site").
      </p>

      <h2 className="text-2xl font-semibold mb-2">2. Purpose of Fair Use</h2>
      <p className="mb-4">
        The content and data on EGData App are provided for informational purposes only. Our goal is
        to offer a comprehensive database of games (or game related data) available in the Epic
        Games Store for educational and reference use by the community.
      </p>

      <h2 className="text-2xl font-semibold mb-2">3. Compliance with Fair Use</h2>
      <p className="mb-4">
        EGData App complies with the principles of fair use under copyright law by providing
        information and data in a manner that benefits the public without infringing on the rights
        of content owners. Here are the key factors that justify our use as fair use:
      </p>
      <ul className="list-disc list-inside mb-4">
        <li>
          <strong>Purpose and Character of Use:</strong> Our website is non-commercial and aims to
          educate and inform the public about games available in the Epic Games Store. We provide
          critical information, reviews, and updates, enhancing the public's knowledge and
          appreciation of these games.
        </li>
        <li>
          <strong>Nature of the Copyrighted Work:</strong> The data we collect and present consists
          of factual information such as game titles, release dates, developers, and updates.
          Factual information is less protected under copyright law than creative works.
        </li>
        <li>
          <strong>Amount and Substantiality:</strong> We only use the amount of data necessary to
          provide meaningful and relevant information to our users. We do not reproduce entire works
          or provide extensive extracts that could replace the original products.
        </li>
        <li>
          <strong>Effect on the Market:</strong> Our use of game data does not negatively impact the
          market for the original games. Instead, it promotes these games by providing up-to-date
          information and driving user engagement and interest.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mb-2">4. Data Collection and Updates</h2>
      <p className="mb-4">
        Our Site automatically tracks and updates game data to ensure that the information we
        provide is current and accurate. This automated process involves collecting publicly
        available information from the Epic Games Store and other reliable sources.
      </p>
      <p className="mb-4">
        By keeping our database up-to-date, we ensure that users have access to the latest
        information about their favorite games, including new releases, updates, and changes in
        availability.
      </p>
      <p className="mb-4">
        In terms of graphical assets, we load the images from the Epic Games Store servers directly.
        We do not store any images on our servers.
      </p>

      <h2 className="text-2xl font-semibold mb-2">5. Leaked Data Disclaimer</h2>
      <p className="mb-4">
        Any data that appears to be leaked on our Site comes from publicly available information
        provided by the Epic Games Store. We do not have access to confidential or proprietary data
        that is not publicly accessible. Therefore, it is the responsibility of the publishers to
        protect their upcoming intellectual properties (IPs), games, downloadable content (DLCs),
        and other sensitive information within the Epic Games Developer portal.
      </p>
      <p className="mb-4">
        Publishers are encouraged to ensure that sensitive information is properly secured and not
        inadvertently made public. EGData App cannot be held responsible for any leaked information
        that was obtained from publicly available sources.
      </p>
      <p className="mb-4">
        For more information on data protection and fair use in the European Union, please refer to
        the following resources:
      </p>
      <ul className="list-disc list-inside mb-4">
        <li>
          <a
            href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32019L0790"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500"
          >
            Directive (EU) 2019/790 on copyright and related rights in the Digital Single Market
          </a>
        </li>
        <li>
          <a
            href="https://ec.europa.eu/commission/presscorner/detail/en/QANDA_21_2821"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500"
          >
            Questions and Answers – New EU copyright rules
          </a>
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mb-2">6. Contact Us</h2>
      <p className="mb-4">
        If you have any questions about this Fair Use Policy or if you believe that any content or
        data on our Site infringes on your copyright, please contact us at:
      </p>
      <p className="mb-4">
        Email:{" "}
        <a href="mailto:fairuse@egdata.app" className="text-blue-500">
          fairuse@egdata.app
        </a>
      </p>
    </div>
  ),

  head: () => {
    return {
      meta: [
        {
          title: "Fair Use Policy - egdata.app",
          description: "Fair Use Policy for egdata.app",
        },
      ],
    };
  },
});
