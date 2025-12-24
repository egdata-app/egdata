import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: () => (
    <div className="flex flex-col items-start justify-start w-full min-h-screen gap-4 mt-10">
      <div className="flex flex-col gap-4">
        <h1 className="text-6xl font-thin">About</h1>
        <p className="mb-4">
          egdata.app is a community-driven website dedicated to tracking and providing information
          about the Epic Games Store. Similar to SteamDB for Steam, we aim to offer a comprehensive
          resource for users to explore changes, discover new games, and stay up-to-date with the
          latest happenings on the platform.
        </p>

        <h2 className="text-2xl font-bold mb-2">Our Mission</h2>
        <p className="mb-4">
          Our mission is to provide transparency and insights into the Epic Games Store ecosystem.
          We believe that by aggregating and presenting data in an accessible way, we can empower
          users to make informed decisions about their gaming purchases and contribute to a better
          understanding of the platform.
        </p>

        <h2 className="text-2xl font-bold mb-2">Features</h2>
        <ul className="list-disc list-inside mb-4">
          <li>Track game price changes and historical data</li>
          <li>View upcoming releases and free game promotions</li>
          <li>Explore game details, ratings, and user reviews</li>
          <li>Analyze trends and patterns in the Epic Games Store</li>
        </ul>

        <h2 className="text-2xl font-bold mb-2">Community Driven</h2>
        <p className="mb-2">
          egdata.app is built and maintained by a passionate community of gamers and developers. We
          welcome contributions from anyone who wants to help improve the website and make it a
          valuable resource for everyone. Feel free to reach out to us if you have any feedback,
          suggestions, or want to get involved.
        </p>
        <p className="mb-4">
          All the source code for egdata.app is available on{" "}
          <Link className="text-blue-500" href="https://github.com/nachoaldamav/egdata">
            GitHub
          </Link>
          .
        </p>

        <h2 className="text-2xl font-bold mb-2">What egdata.app is NOT</h2>
        <p className="mb-4">It's important to clarify that egdata.app is not:</p>
        <ul className="list-disc list-inside mb-4">
          <li>
            Affiliated with Epic Games: We are an independent, community-driven project and not
            officially endorsed or associated with Epic Games in any way.
          </li>
          <li>
            A storefront or marketplace: We do not sell games or provide any purchasing options. Our
            focus is on providing information and data about the Epic Games Store.
          </li>
          <li>
            A platform for piracy or illegal activities: We strongly condemn piracy and do not
            provide any means to access or distribute copyrighted content illegally.
          </li>
        </ul>

        <h2 className="text-2xl font-bold mb-2">Fair Use Policy</h2>
        <p className="mb-4">
          egdata.app is committed to complying with fair use principles under copyright law. We
          provide information and data for informational purposes only, aiming to educate and inform
          the public about games available on the Epic Games Store.
        </p>

        <h3 className="text-xl font-semibold mb-2">Key Factors Justifying Fair Use:</h3>
        <ul className="list-disc list-inside mb-4">
          <li>
            <strong>Non-Commercial, Educational Purpose:</strong> Our website is non-commercial and
            seeks to enhance public knowledge about Epic Games Store games.
          </li>
          <li>
            <strong>Factual Information:</strong> We primarily present factual data like game
            titles, release dates, and developers, which is less protected under copyright.
          </li>
          <li>
            <strong>Limited Use:</strong> We use only the necessary amount of data to provide
            meaningful information without replacing the original works.
          </li>
          <li>
            <strong>No Market Harm:</strong> Our use does not negatively impact the market for the
            original games; rather, it may promote them through increased user interest.
          </li>
        </ul>

        <p className="mb-4">
          We automatically track and update game data from publicly available sources, including the
          Epic Games Store. We load graphical assets directly from their servers and do not store
          them.
        </p>

        <h3 className="text-xl font-semibold mb-2">Leaked Data Disclaimer:</h3>
        <p className="mb-4">
          Any seemingly leaked data on our site originates from publicly available information on
          the Epic Games Store. We do not access confidential or proprietary data. Publishers are
          responsible for protecting their sensitive information within the{" "}
          <Link
            href="https://dev.epicgames.com/portal/en-US"
            className="text-blue-500"
            target="_blank"
            rel="noopener noreferrer"
          >
            Epic Games Developer portal
          </Link>
          .
        </p>
        <p className="mb-4">
          In developing our Fair Use Policy, we have taken into consideration the principles
          outlined in the following EU copyright directives:
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

        <p className="mb-4">
          If you have questions about our Fair Use Policy or believe any content infringes on your
          copyright, please contact us at:{" "}
          <a href="mailto:fairuse@egdata.app" className="text-blue-500">
            fairuse@egdata.app
          </a>
        </p>

        <h2 className="text-2xl font-bold mb-2">Contact Us</h2>
        <p className="mb-4">
          You can contact us via{" "}
          <Link className="text-blue-500" href="mailto:contact@egdata.app">
            contact@egdata.app
          </Link>
          .
        </p>
      </div>
    </div>
  ),
});
