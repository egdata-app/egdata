import type { TypeOf } from 'zod';
import type { formSchema } from '@/stores/searchStore';
import type { FullTag } from '@/types/tags';
import type { SearchV2Response } from '@/types/search-v2';
import { Input } from '@/components/ui/input';
import { QuickPill } from '@/components/app/quick-pill';
import { Separator } from '@/components/ui/separator';
import { PriceRangeSlider } from '@/components/ui/price-range-slider';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { CheckboxWithCount } from '@/components/app/checkbox-with-count';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExtendedSearch } from '@/components/app/extended-search';
import { Checkbox } from '@/components/ui/checkbox';
import { offersDictionary } from '@/lib/offers-dictionary';

export interface SearchFiltersProps {
  query: TypeOf<typeof formSchema>;
  setField: <K extends keyof TypeOf<typeof formSchema>>(
    field: K,
    value: TypeOf<typeof formSchema>[K],
  ) => void;
  loading: boolean;
  results: SearchV2Response | null | undefined;
  tags: FullTag[];
  tagTypes: { name: string; label: string }[];
  priceRange: { min: number; max: number; currency: string };
  offerTypeCounts: Record<string, number>;
  tagCounts: Record<string, number>;
  developerCounts: Record<string, number>;
  publisherCounts: Record<string, number>;
  controls: {
    showTitle: boolean;
    showTags: boolean;
    showDeveloper: boolean;
    showPublisher: boolean;
    showOfferType: boolean;
    showOnSale: boolean;
    showCodeRedemption: boolean;
    showBlockchain: boolean;
    showPastGiveaways: boolean;
    showSeller: boolean;
    showPrice: boolean;
  };
}

export function SearchFilters({
  query,
  setField,
  tags,
  tagTypes,
  priceRange,
  offerTypeCounts,
  tagCounts,
  developerCounts,
  publisherCounts,
  controls,
}: SearchFiltersProps) {
  const {
    showTitle,
    showTags,
    showDeveloper,
    showPublisher,
    showOfferType,
    showOnSale,
    showCodeRedemption,
    showBlockchain,
    showPastGiveaways,
    showSeller,
    showPrice,
  } = controls;

  // Handlers for updating query
  const handleFieldChange = <K extends keyof TypeOf<typeof formSchema>>(
    field: K,
    value: TypeOf<typeof formSchema>[K],
  ) => {
    setField(field, value);
  };

  // For array fields like tags
  const handleArrayFieldChange = (
    field: keyof TypeOf<typeof formSchema>,
    value: string[],
  ) => {
    setField(field, value as TypeOf<typeof formSchema>[typeof field]);
  };

  // Helper type guard for string array
  function isStringArray(val: unknown): val is string[] {
    return Array.isArray(val) && val.every((v) => typeof v === 'string');
  }

  return (
    <aside className="flex flex-col gap-4 w-80">
      {showTitle && (
        <Input
          type="search"
          placeholder="Search for games"
          name="title"
          value={query.title || ''}
          onChange={(e) =>
            handleFieldChange(
              'title',
              e.target.value === '' ? undefined : e.target.value,
            )
          }
        />
      )}

      {/* Selected Filters Pills */}
      <div id="selected_filters" className="flex flex-row flex-wrap gap-2">
        {showTags &&
          (isStringArray(query.tags) ? query.tags : []).map((tag) => {
            const tagData = tags?.find((t) => t.id === tag);
            return (
              <QuickPill
                key={tag}
                label={tagData?.name ?? tag}
                onRemove={() => {
                  handleArrayFieldChange(
                    'tags',
                    (isStringArray(query.tags) ? query.tags : []).filter(
                      (t) => t !== tag,
                    ),
                  );
                }}
              />
            );
          })}
        {showDeveloper && query.developerDisplayName && (
          <QuickPill
            label={query.developerDisplayName}
            onRemove={() =>
              handleFieldChange('developerDisplayName', undefined)
            }
          />
        )}
        {showPublisher && query.publisherDisplayName && (
          <QuickPill
            label={query.publisherDisplayName}
            onRemove={() =>
              handleFieldChange('publisherDisplayName', undefined)
            }
          />
        )}
        {showOfferType && query.offerType && (
          <QuickPill
            label={offersDictionary[query.offerType] ?? query.offerType}
            onRemove={() => handleFieldChange('offerType', undefined)}
          />
        )}
        {showOnSale && query.onSale && (
          <QuickPill
            label="On Sale"
            onRemove={() => handleFieldChange('onSale', undefined)}
          />
        )}
        {showCodeRedemption && query.isCodeRedemptionOnly && (
          <QuickPill
            label="Code Redemption Only"
            onRemove={() =>
              handleFieldChange('isCodeRedemptionOnly', undefined)
            }
          />
        )}
        {showBlockchain && query.excludeBlockchain && (
          <QuickPill
            label="Exclude Blockchain/NFT"
            onRemove={() => handleFieldChange('excludeBlockchain', undefined)}
          />
        )}
        {showSeller && query.seller && (
          <QuickPill
            label={query.seller}
            onRemove={() => handleFieldChange('seller', undefined)}
          />
        )}
        {showPastGiveaways && query.pastGiveaways && (
          <QuickPill
            label="Past Giveaways"
            onRemove={() => handleFieldChange('pastGiveaways', undefined)}
          />
        )}
      </div>

      <Separator />

      {showPrice && (
        <PriceRangeSlider
          min={priceRange.min}
          max={Math.min(priceRange.max, 1000)}
          step={1}
          defaultValue={[
            query.price?.min || priceRange.min,
            query.price?.max || priceRange.max,
          ]}
          onValueChange={(value) => {
            handleFieldChange('price', { min: value[0], max: value[1] });
          }}
          currency={priceRange.currency === '' ? 'USD' : priceRange.currency}
        />
      )}

      <Accordion type="single" collapsible className="w-full">
        {showOfferType && (
          <AccordionItem value="offerType">
            <AccordionTrigger>Offer Type</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-2 w-full mt-2">
              {Object.entries(offersDictionary)
                .filter(([, value]) => value !== 'Unknown')
                .filter(([key]) => offerTypeCounts[key] > 0)
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map(([key, value]) => (
                  <CheckboxWithCount
                    key={key}
                    checked={query.offerType === key}
                    onChange={(checked: boolean) =>
                      handleFieldChange(
                        'offerType',
                        checked
                          ? // @ts-expect-error - TODO: fix this
                            (key as (typeof formSchema.shape.offerType._def.values)[number])
                          : undefined,
                      )
                    }
                    count={offerTypeCounts[key] || undefined}
                    label={value}
                  />
                ))}
            </AccordionContent>
          </AccordionItem>
        )}

        {showTags &&
          tagTypes.map((tagType) => {
            const tagTypeTags = tags?.filter(
              (tag) => tag.groupName === tagType.name,
            );
            return (
              <AccordionItem
                key={tagType.name}
                value={tagType.name ?? 'alltags'}
              >
                <AccordionTrigger>{tagType.label}</AccordionTrigger>
                <AccordionContent className="flex flex-col gap-2 mt-2">
                  <ScrollArea>
                    <div className="max-h-[400px] flex flex-col gap-1">
                      {tagTypeTags
                        ?.filter((tag) => tagCounts[tag.id] > 0)
                        .map((tag) => (
                          <CheckboxWithCount
                            key={tag.id}
                            checked={
                              isStringArray(query.tags) &&
                              query.tags.includes(tag.id)
                            }
                            onChange={(checked: boolean) => {
                              if (checked) {
                                handleArrayFieldChange('tags', [
                                  ...(isStringArray(query.tags)
                                    ? query.tags
                                    : []),
                                  tag.id,
                                ]);
                              } else {
                                handleArrayFieldChange(
                                  'tags',
                                  (isStringArray(query.tags)
                                    ? query.tags
                                    : []
                                  ).filter((t) => t !== tag.id),
                                );
                              }
                            }}
                            count={tagCounts[tag.id] || undefined}
                            label={tag.name}
                          />
                        ))}
                      {tagTypeTags?.filter((tag) => tagCounts[tag.id] > 0)
                        .length === 0 && (
                        <span className="text-gray-400 px-4">
                          No tags found
                        </span>
                      )}
                    </div>
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            );
          })}

        {showDeveloper && (
          <AccordionItem value="developer">
            <AccordionTrigger>Developer</AccordionTrigger>
            <AccordionContent>
              {(Object.keys(developerCounts).length > 0 ||
                query.developerDisplayName) && (
                <ExtendedSearch
                  name="developers"
                  items={Object.entries(developerCounts).map(
                    ([key, value]) => ({
                      id: key,
                      name: key,
                      count: value as number,
                    }),
                  )}
                  value={query.developerDisplayName}
                  setValue={(val) =>
                    handleFieldChange('developerDisplayName', val)
                  }
                />
              )}
            </AccordionContent>
          </AccordionItem>
        )}

        {showPublisher && (
          <AccordionItem value="publisher">
            <AccordionTrigger>Publisher</AccordionTrigger>
            <AccordionContent>
              {(Object.keys(publisherCounts).length > 0 ||
                query.publisherDisplayName) && (
                <ExtendedSearch
                  name="publishers"
                  items={Object.entries(publisherCounts).map(
                    ([key, value]) => ({
                      id: key,
                      name: key,
                      count: value as number,
                    }),
                  )}
                  value={query.publisherDisplayName}
                  setValue={(val) =>
                    handleFieldChange('publisherDisplayName', val)
                  }
                />
              )}
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Seller search can be implemented similarly if needed */}
      </Accordion>

      {showPastGiveaways && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="pastGiveaways"
            checked={Boolean(query.pastGiveaways)}
            onCheckedChange={(value) =>
              handleFieldChange('pastGiveaways', value ? true : undefined)
            }
          />
          <label
            htmlFor="pastGiveaways"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Past Giveaways
          </label>
        </div>
      )}

      {showOnSale && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="onSale"
            checked={!!query.onSale}
            onCheckedChange={(value) =>
              handleFieldChange('onSale', value ? true : undefined)
            }
          />
          <label
            htmlFor="onSale"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            On Sale
          </label>
        </div>
      )}

      {showCodeRedemption && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isCodeRedemptionOnly"
            checked={!!query.isCodeRedemptionOnly}
            onCheckedChange={(value) =>
              handleFieldChange(
                'isCodeRedemptionOnly',
                value ? true : undefined,
              )
            }
          />
          <label
            htmlFor="isCodeRedemptionOnly"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Code Redemption Only
          </label>
        </div>
      )}

      {showBlockchain && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="excludeBlockchain"
            checked={!!query.excludeBlockchain}
            onCheckedChange={(value) =>
              handleFieldChange('excludeBlockchain', value ? true : undefined)
            }
          />
          <label
            htmlFor="excludeBlockchain"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Exclude Blockchain/NFT
          </label>
        </div>
      )}
    </aside>
  );
}
