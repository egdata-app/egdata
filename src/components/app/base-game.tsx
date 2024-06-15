import { Link } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { client } from '~/lib/client';
import { getImage } from '~/lib/getImage';
import { internalNamespaces } from '~/lib/internal-namespaces';
import { cn } from '~/lib/utils';
import type { SingleOffer } from '~/types/single-offer';

export const BaseGame: React.FC<{ offer: SingleOffer }> = ({ offer }) => {
  if (offer.offerType === 'BASE_GAME' || internalNamespaces.includes(offer.namespace)) {
    return null;
  }

  const [game, setGame] = useState<SingleOffer | null>(null);

  useEffect(() => {
    client.get(`/base-game/${offer.namespace}`).then((response) => {
      setGame(response.data);
    });
  }, [offer.namespace]);

  if (!game) {
    return null;
  }

  const image =
    getImage(game.keyImages, ['DieselGameBox', 'DieselGameBoxWide', 'OfferImageWide'])?.url ||
    'https://via.placeholder.com/1920x1080';

  return (
    <Link
      className="flex items-center bg-gray-800 rounded-lg shadow-lg w-full h-16 relative mt-2 overflow-hidden group"
      to={`/offers/${game.id}`}
      prefetch="viewport"
    >
      <span className="text-white font-bold absolute z-20 flex-col px-5 gap-1">
        <h6 className="text-xs">Check the base game</h6>
        <h4 className="text-lg font-bold">{game.title}</h4>
      </span>
      <span
        className={cn(
          'absolute inset-0 z-[11]',
          'from-gray-700/20 to-gray-700/20 backdrop-blur-sm',
          'group-hover:backdrop-blur-none transition-all duration-700',
          'bg-gradient-to-r group-hover:from-gray-700/30 group-hover:from-40% group-hover:to-transparent',
        )}
      />
      <div className="absolute inset-0">
        <img
          style={{
            objectFit: 'cover',
          }}
          src={`https://cdn.egdata.app/cdn-cgi/image/width=720,quality=100,f=webp/${image}`}
          alt={game.title}
          className="rounded-lg h-full w-full absolute object-cover z-10 opacity-40 group-hover:opacity-75 transition-opacity duration-500"
          loading="lazy"
        />
      </div>
    </Link>
  );
};
