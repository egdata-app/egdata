import type { useForm } from "@tanstack/react-form";
import type { TypeOf } from "zod";
import { useSearchState } from "@/hooks/use-search-state";
import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import type { FullTag } from "@/types/tags";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { offersDictionary } from "@/lib/offers-dictionary";
import { CheckboxWithCount } from "@/components/app/checkbox-with-count";
import { ExtendedSearch } from "@/components/app/extended-search";
import { QuerySearch } from "@/components/app/query-search";
import { Checkbox } from "@/components/ui/checkbox";
import { PriceRangeSlider } from "@/components/ui/price-range-slider";
import { QuickPill } from "@/components/app/quick-pill";
import type { formSchema } from "./search-form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const tagTypes: {
  name: string | null;
  type: "single" | "multiple";
  label: string;
}[] = [
  { name: "event", type: "single", label: "Events" },
  { name: "genre", type: "multiple", label: "Genres" },
  { name: "usersay", type: "multiple", label: "User Say" },
  { name: "feature", type: "multiple", label: "Features" },
  { name: "epicfeature", type: "multiple", label: "Epic Features" },
  { name: "accessibility", type: "multiple", label: "Accessibility" },
  { name: null, type: "multiple", label: "All Tags" },
];

export type SearchFiltersProps = {
  // @ts-expect-error
  form: ReturnType<typeof useForm<TypeOf<typeof formSchema>>>;
  className?: string;
  showTitle?: boolean;
  showPrice?: boolean;
  showOfferType?: boolean;
  showTags?: boolean;
  showDeveloper?: boolean;
  showPublisher?: boolean;
  showSeller?: boolean;
  showOnSale?: boolean;
  showCodeRedemption?: boolean;
  showBlockchain?: boolean;
  showPastGiveaways?: boolean;
};

export function SearchFilters({
  form,
  className,
  showTitle = true,
  showPrice = true,
  showOfferType = true,
  showTags = true,
  showDeveloper = true,
  showPublisher = true,
  showSeller = true,
  showOnSale = true,
  showCodeRedemption = true,
  showBlockchain = true,
  showPastGiveaways = false,
}: SearchFiltersProps) {
  const { tagCounts, offerTypeCounts, developerCounts, publisherCounts, priceRange } =
    useSearchState();

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: () => httpClient.get<FullTag[]>("/search/tags"),
    refetchInterval: 1000 * 60,
  });

  return (
    <aside className={cn("flex flex-col gap-4 w-80", className)}>
      {showTitle && (
        <form.Field name="title">
          {({ name, handleChange, handleBlur, state }) => (
            <Input
              type="search"
              placeholder="Search for games"
              className=""
              name={name}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
              value={state.value}
            />
          )}
        </form.Field>
      )}

      <form.Subscribe>
        {({ values }) => (
          <div id="selected_filters" className="flex flex-row flex-wrap gap-2">
            {showTags &&
              values.tags?.map((tag) => {
                const tagData = tags?.find((t) => t.id === tag);
                return (
                  <QuickPill
                    key={tag}
                    label={tagData?.name ?? tag}
                    onRemove={() => {
                      const currentTags = form.state.values.tags || [];
                      form.setFieldValue(
                        "tags",
                        currentTags.filter((t) => String(t) !== String(tag)),
                      );
                    }}
                  />
                );
              })}
            {showDeveloper && values.developerDisplayName && (
              <QuickPill
                label={values.developerDisplayName}
                onRemove={() => form.setFieldValue("developerDisplayName", undefined)}
              />
            )}
            {showPublisher && values.publisherDisplayName && (
              <QuickPill
                label={values.publisherDisplayName}
                onRemove={() => form.setFieldValue("publisherDisplayName", undefined)}
              />
            )}
            {showOfferType && values.offerType && (
              <QuickPill
                label={offersDictionary[values.offerType] ?? values.offerType}
                onRemove={() => form.setFieldValue("offerType", undefined)}
              />
            )}
            {showOnSale && values.onSale && (
              <QuickPill label="On Sale" onRemove={() => form.setFieldValue("onSale", undefined)} />
            )}
            {showCodeRedemption && values.isCodeRedemptionOnly && (
              <QuickPill
                label="Code Redemption Only"
                onRemove={() => form.setFieldValue("isCodeRedemptionOnly", undefined)}
              />
            )}
            {showBlockchain && values.excludeBlockchain && (
              <QuickPill
                label="Exclude Blockchain/NFT"
                onRemove={() => form.setFieldValue("excludeBlockchain", undefined)}
              />
            )}
            {showSeller && values.seller && (
              <QuickPill
                label={values.seller}
                onRemove={() => {
                  form.setFieldValue("seller", undefined);
                  // Force a re-render of the QuerySearch component
                  form.setFieldValue("seller", undefined);
                }}
              />
            )}
            {showPastGiveaways && values.pastGiveaways && (
              <QuickPill
                label="Past Giveaways"
                onRemove={() => form.setFieldValue("pastGiveaways", undefined)}
              />
            )}
          </div>
        )}
      </form.Subscribe>

      <Separator />

      {showPrice && (
        <form.Field name="price">
          {({ handleChange }) => (
            <PriceRangeSlider
              min={priceRange.min}
              max={Math.min(priceRange.max, 1000)}
              step={1}
              defaultValue={[
                form.state.values.price?.min || priceRange.min,
                form.state.values.price?.max || priceRange.max,
              ]}
              onValueChange={(value) => {
                handleChange({
                  min: value[0],
                  max: value[1],
                });
              }}
              currency={priceRange.currency === "" ? "USD" : priceRange.currency}
            />
          )}
        </form.Field>
      )}

      <Accordion type="single" collapsible className="w-full">
        {showOfferType && (
          <AccordionItem value="offerType">
            <AccordionTrigger>Offer Type</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-2 w-full mt-2">
              <form.Field name="offerType">
                {({ handleChange, state }) =>
                  Object.entries(offersDictionary)
                    .filter(([, value]) => value !== "Unknown")
                    .filter(([key]) => offerTypeCounts[key] > 0)
                    .sort((a, b) => a[1].localeCompare(b[1]))
                    .map(([key, value]) => (
                      <CheckboxWithCount
                        key={key}
                        checked={state.value === key}
                        onChange={(checked: boolean) => handleChange(checked ? key : undefined)}
                        count={offerTypeCounts[key] || undefined}
                        label={value}
                      />
                    ))
                }
              </form.Field>
            </AccordionContent>
          </AccordionItem>
        )}

        {showTags &&
          tagTypes.map((tagType) => {
            const tagTypeTags = tags?.filter((tag) => tag.groupName === tagType.name);

            return (
              <AccordionItem key={tagType.name} value={tagType.name ?? "alltags"}>
                <AccordionTrigger>{tagType.label}</AccordionTrigger>
                <AccordionContent className="flex flex-col gap-2 mt-2">
                  <ScrollArea>
                    <div className="max-h-[400px] flex flex-col gap-1">
                      <form.Field name="tags">
                        {({ handleChange, state }) =>
                          tagTypeTags
                            ?.filter((tag) => tagCounts[tag.id] > 0)
                            .map((tag) => (
                              <CheckboxWithCount
                                key={tag.id}
                                checked={state.value?.includes(tag.id)}
                                onChange={(checked: boolean) =>
                                  handleChange(
                                    checked
                                      ? [...(state.value ?? []), tag.id]
                                      : state.value?.filter((t) => t !== tag.id),
                                  )
                                }
                                count={tagCounts[tag.id] || undefined}
                                label={tag.name}
                              />
                            ))
                        }
                      </form.Field>
                      {tagTypeTags?.filter((tag) => tagCounts[tag.id] > 0).length === 0 && (
                        <span className="text-gray-400 px-4">No tags found</span>
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
              <form.Field name="developerDisplayName">
                {({ handleChange, state }) => (
                  <ExtendedSearch
                    name="developers"
                    items={
                      developerCounts
                        ? Object.entries(developerCounts).map(([key, value]) => ({
                            id: key,
                            name: key,
                            count: value,
                          }))
                        : []
                    }
                    value={state.value}
                    setValue={handleChange}
                  />
                )}
              </form.Field>
            </AccordionContent>
          </AccordionItem>
        )}

        {showPublisher && (
          <AccordionItem value="publisher">
            <AccordionTrigger>Publisher</AccordionTrigger>
            <AccordionContent>
              <form.Field name="publisherDisplayName">
                {({ handleChange, state }) => (
                  <ExtendedSearch
                    name="publishers"
                    items={
                      publisherCounts
                        ? Object.entries(publisherCounts).map(([key, value]) => ({
                            id: key,
                            name: key,
                            count: value,
                          }))
                        : []
                    }
                    value={state.value}
                    setValue={handleChange}
                  />
                )}
              </form.Field>
            </AccordionContent>
          </AccordionItem>
        )}

        {showSeller && (
          <AccordionItem value="seller">
            <AccordionTrigger>Seller</AccordionTrigger>
            <AccordionContent>
              <form.Field name="seller">
                {({ handleChange, state }) => (
                  <QuerySearch
                    queryKey={["search", "items"]}
                    fetchItems={async (query) => {
                      return httpClient
                        .get<{
                          hits: {
                            _id: string;
                            name: string;
                            createdAt: string;
                            updatedAt: string;
                            __v: number;
                          }[];
                          query: string;
                          processingTimeMs: number;
                          limit: number;
                          offset: number;
                          estimatedTotalHits: number;
                        }>("/multisearch/sellers", {
                          params: {
                            query,
                          },
                        })
                        .then((res) =>
                          res.hits.map((hit) => ({
                            id: hit._id,
                            name: hit.name,
                          })),
                        );
                    }}
                    name="Sellers"
                    value={state.value}
                    setValue={handleChange}
                    initialItems={[]}
                  />
                )}
              </form.Field>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {showPastGiveaways && (
        <form.Field name="pastGiveaways">
          {({ handleChange, state }) => (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pastGiveaways"
                checked={state.value}
                onCheckedChange={(value) => handleChange(Boolean(value))}
              />
              <label
                htmlFor="pastGiveaways"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Past Giveaways
              </label>
            </div>
          )}
        </form.Field>
      )}

      {showOnSale && (
        <form.Field name="onSale">
          {({ handleChange, state }) => (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="onSale"
                checked={state.value}
                onCheckedChange={(value) => handleChange(Boolean(value))}
              />
              <label
                htmlFor="onSale"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                On Sale
              </label>
            </div>
          )}
        </form.Field>
      )}

      {showCodeRedemption && (
        <form.Field name="isCodeRedemptionOnly">
          {({ handleChange, state }) => (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isCodeRedemptionOnly"
                checked={state.value}
                onCheckedChange={(value) => handleChange(Boolean(value))}
              />
              <label
                htmlFor="isCodeRedemptionOnly"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Code Redemption Only
              </label>
            </div>
          )}
        </form.Field>
      )}

      {showBlockchain && (
        <form.Field name="excludeBlockchain">
          {({ handleChange, state }) => (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="excludeBlockchain"
                checked={state.value}
                onCheckedChange={(value) => handleChange(value as boolean)}
              />
              <label
                htmlFor="excludeBlockchain"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Exclude Blockchain/NFT
              </label>
            </div>
          )}
        </form.Field>
      )}
    </aside>
  );
}
