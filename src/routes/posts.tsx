import { Image } from "@/components/app/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/posts")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      <Image
        src="https://tse3.mm.bing.net/th?id=OIF.Hc43sii5eliKbenwW2%2FaSA&pid=Api"
        alt="LEGO Star Wars: The Skywalker Saga Cover Art"
        width={1200}
        height={675}
        className="rounded-lg object-cover w-full aspect-video mb-8"
      />
      <h1 className="text-4xl font-bold my-4">
        Get LEGO® Star Wars™: The Skywalker Saga for FREE on Epic Games Store
      </h1>
      <div className="flex items-center mb-6 space-x-4">
        <Badge variant="secondary">Free Game</Badge>
        <p className="text-sm text-muted-foreground">Published on November 30, 2023</p>
      </div>
      <div className="prose prose-lg prose-invert max-w-none">
        <p className="font-bold">
          Mark your calendars, Star Wars fans! From{" "}
          <span className="text-primary">December 5 to December 12, 2024</span>, you can grab the
          critically acclaimed{" "}
          <span className="text-primary">LEGO® Star Wars™: The Skywalker Saga</span> for FREE on the
          Epic Games Store. This game, which usually costs{" "}
          <span className="text-primary">$49.99</span>, lets you relive the iconic moments of the{" "}
          <span className="text-primary">Skywalker saga</span> with a fun LEGO twist.
        </p>

        <Image
          src="https://tse3.mm.bing.net/th?id=OIF.Hc43sii5eliKbenwW2%2FaSA&pid=Api"
          alt="LEGO Star Wars: The Skywalker Saga Cover Art"
          width={800}
          height={450}
          className="rounded-lg object-cover w-full aspect-video my-8"
        />

        <h2>🧩 What to Expect?</h2>
        <p>
          Developed by <strong>TT Games</strong> and published by <strong>Warner Bros.</strong>,
          this title offers a comprehensive Star Wars experience like no other. Here's what makes it
          a must-play:
        </p>
        <ul>
          <li>
            🌌 <strong>All 9 Movies</strong>: Relive the storylines of all nine Skywalker saga
            films, packed with classic LEGO humor.
          </li>
          <li>
            🛸 <strong>300+ Playable Characters</strong>: Control your favorite heroes and villains
            from the galaxy far, far away.
          </li>
          <li>
            🚀 <strong>100+ Vehicles</strong>: Fly iconic ships like the Millennium Falcon and TIE
            Fighters.
          </li>
          <li>
            🌍 <strong>23 Planets to Explore</strong>: Travel to familiar worlds, from Tatooine to
            Endor, and beyond.
          </li>
        </ul>

        <Image
          src="https://tse4.mm.bing.net/th?id=OIF.GV3NuTTw5%2B81NNXn6xosgA&pid=Api"
          alt="LEGO Star Wars Gameplay"
          width={800}
          height={450}
          className="rounded-lg object-cover w-full aspect-video my-8"
        />

        <h2>🌟 What Makes This Game Special?</h2>
        <p>
          Since its release in <strong>April 2022</strong>, LEGO Star Wars: The Skywalker Saga has
          been praised for its engaging gameplay and faithful adaptation of the Star Wars universe.
          With an <strong>82 Metascore</strong> on Metacritic, critics and fans alike have
          highlighted its:
        </p>
        <ul>
          <li>
            🕹️ <strong>Dynamic Combat</strong>: Lightsaber battles, blaster shootouts, and space
            dogfights.
          </li>
          <li>
            🏗️ <strong>LEGO Charm</strong>: Classic Star Wars humor, reimagined in LEGO's unique
            style.
          </li>
          <li>
            🤯 <strong>Replayability</strong>: Tons of collectibles, side missions, and hidden
            secrets.
          </li>
        </ul>

        <Image
          src="https://tse3.mm.bing.net/th?id=OIF.lT4bZyWzcKW%2FVGY9Jlk52Q&pid=Api"
          alt="LEGO Star Wars Characters"
          width={800}
          height={450}
          className="rounded-lg object-cover w-full aspect-video my-8"
        />

        <h2>🎁 How to Claim It?</h2>
        <p>Getting your free copy is easy!</p>
        <ol>
          <li>
            Visit the{" "}
            <a
              href="https://store.epicgames.com/en-US/p/lego-star-wars-the-skywalker-saga"
              target="_blank"
              rel="noopener noreferrer"
            >
              Epic Games Store
            </a>{" "}
            between <strong>December 5</strong> and <strong>December 12, 2024</strong>.
          </li>
          <li>Add the game to your library.</li>
          <li>It's yours to keep forever!</li>
        </ol>

        <Card className="my-8">
          <CardContent className="p-6">
            <p className="text-lg font-semibold mb-2">
              Don't miss this chance to embark on a LEGO-infused journey across the galaxy!
            </p>
            <p>
              Whether you're a die-hard Star Wars fan or a newcomer, this game offers endless fun
              for everyone.
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xl font-bold">
          May the Force (and LEGO bricks) be with you! 🧱✨
        </p>
      </div>
    </article>
  );
}
