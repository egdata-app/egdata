import type { SingleOffer } from '@/types/single-offer';
import { getImage } from './get-image';

export const generateOfferMeta = (
  offer: SingleOffer,
  section?: string,
): Array<React.JSX.IntrinsicElements['meta']> => {
  return [
    {
      title: `${offer?.title}${section ? ` - ${section}` : ''} | egdata.app`,
    },
    {
      name: 'description',
      content: section
        ? `Explore ${offer?.title} ${section.toLowerCase()}.`
        : `Explore detailed information about ${offer?.title}. Discover the current and historical price, achievements, reviews and more.`,
    },
    {
      name: 'og:title',
      content: `${offer?.title}${section ? ` - ${section}` : ''} | egdata.app`,
    },
    {
      name: 'og:description',
      content: section
        ? `Explore ${offer?.title} ${section.toLowerCase()}.`
        : `Explore detailed information about ${offer?.title}. Discover the current and historical price, achievements, reviews and more.`,
    },
    {
      name: 'og:image',
      content: `https://api.egdata.app/offers/${offer.id}/og?v=${new Date(offer.lastModifiedDate).getTime()}`,
    },
    {
      name: 'og:type',
      content: 'website',
    },
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:title',
      content: `${offer?.title}${section ? ` - ${section}` : ''} | egdata.app`,
    },
    {
      name: 'twitter:description',
      content: section
        ? `Explore ${offer?.title} ${section.toLowerCase()}.`
        : `Explore detailed information about ${offer?.title}. Discover the current and historical price, achievements, reviews and more.`,
    },
    {
      name: 'twitter:image',
      content: `https://api.egdata.app/offers/${offer.id}/og?v=${new Date(offer.lastModifiedDate).getTime()}`,
    },
  ];
};
