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
import { offersDictionary, offerTypeValues } from "@/lib/offers-dictionary";
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
import { useTranslation } from "@/lib/paraglide-react";

const tagTypeKeys: {
  name: string | null;
  type: "single" | "multiple";
  labelKey: string;
}[] = [
  { name: "event", type: "single", labelKey: "search.tagGroups.event" },
  { name: "genre", type: "multiple", labelKey: "search.tagGroups.genre" },
  { name: "usersay", type: "multiple", labelKey: "search.tagGroups.usersay" },
  { name: "feature", type: "multiple", labelKey: "search.tagGroups.feature" },
  { name: "epicfeature", type: "multiple", labelKey: "search.tagGroups.epicfeature" },
  { name: "accessibility", type: "multiple", labelKey: "search.tagGroups.accessibility" },
  { name: null, type: "multiple", labelKey: "search.tagGroups.all" },
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
  const { t } = useTranslation();

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: () => httpClient.v1Get<FullTag[]>("/search/tags"),
    refetchInterval: 1000 * 60,
  });

  return (
    <aside
      className={cn(
        "flex w-80 flex-col gap-4 rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm",
        className,
      )}
    >
      {showTitle && (
        <form.Field name="title">
          {({ name, handleChange, handleBlur, state }: any) => (
            <Input
              type="search"
              placeholder={t("search.filtersPlaceholder")}
              className="h-9 rounded-lg border-border/60 bg-background/60 px-3 text-sm transition-colors duration-150 hover:border-primary/50 focus-visible:border-primary/70"
              name={name}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
              value={state.value}
            />
          )}
        </form.Field>
      )}

      <form.Subscribe>
        {({ values }: any) => (
          <div
            id="selected_filters"
            className="flex flex-row flex-wrap gap-1.5 [&_button]:border-border/60 [&_button]:bg-background/60 [&_button]:transition-colors [&_button]:duration-150 [&_button:hover]:border-primary/50 [&_button:hover]:bg-accent/60"
          >
            {showTags &&
              values.tags?.map((tag: string) => {
                const tagData = tags?.find((t) => t.id === tag);
                return (
                  <QuickPill
                    key={tag}
                    label={tagData?.name ?? tag}
                    onRemove={() => {
                      const currentTags = form.state.values.tags || [];
                      form.setFieldValue(
                        "tags",
                        currentTags.filter((t: string) => String(t) !== String(tag)),
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
                label={
                  offersDictionary[values.offerType as keyof typeof offersDictionary] ??
                  values.offerType
                }
                onRemove={() => form.setFieldValue("offerType", undefined)}
              />
            )}
            {showOnSale && values.onSale && (
              <QuickPill
                label={t("search.pills.onSale")}
                onRemove={() => form.setFieldValue("onSale", undefined)}
              />
            )}
            {showCodeRedemption && values.isCodeRedemptionOnly && (
              <QuickPill
                label={t("search.pills.codeRedemptionOnly")}
                onRemove={() => form.setFieldValue("isCodeRedemptionOnly", undefined)}
              />
            )}
            {showBlockchain && values.excludeBlockchain && (
              <QuickPill
                label={t("search.pills.excludeBlockchain")}
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
                label={t("search.pills.pastGiveaways")}
                onRemove={() => form.setFieldValue("pastGiveaways", undefined)}
              />
            )}
          </div>
        )}
      </form.Subscribe>

      <Separator className="bg-border/60" />

      {showPrice && (
        <div className="px-0.5 tabular-nums">
          <form.Field name="price">
            {({ handleChange }: any) => (
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
        </div>
      )}

      <Accordion className="w-full overflow-hidden rounded-lg border border-border/60 bg-background/40">
        {showOfferType && (
          <AccordionItem
            id="offerType"
            className="border-border/60 transition-colors duration-150 data-open:bg-card/60"
          >
            <AccordionTrigger className="font-display px-3 py-2.5 text-sm font-semibold tracking-tight text-foreground transition-colors duration-150 hover:bg-accent/60 hover:text-primary hover:no-underline">
              {t("search.accordion.offerType")}
            </AccordionTrigger>
            <AccordionContent className="mt-1 flex w-full flex-col gap-1.5 px-1 pb-2 [&_button]:w-full [&_button]:border-border/60 [&_button]:duration-150 [&_button:hover]:border-primary/50 [&_button:hover]:bg-accent/60">
              <form.Field name="offerType">
                {({ handleChange, state }: any) =>
                  offerTypeValues
                    .map((key) => [key, offersDictionary[key]] as const)
                    .filter(([key, value]) => value !== "Unknown" && offerTypeCounts[key] > 0)
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
          tagTypeKeys.map((tagType) => {
            const tagTypeTags = tags?.filter((tag) => tag.groupName === tagType.name);

            return (
              <AccordionItem
                key={tagType.name ?? "alltags"}
                id={tagType.name ?? "alltags"}
                className="border-border/60 transition-colors duration-150 data-open:bg-card/60"
              >
                <AccordionTrigger className="font-display px-3 py-2.5 text-sm font-semibold tracking-tight text-foreground transition-colors duration-150 hover:bg-accent/60 hover:text-primary hover:no-underline">
                  {t(tagType.labelKey as never)}
                </AccordionTrigger>
                <AccordionContent className="mt-1 flex flex-col gap-1.5 px-1 pb-2 [&_button]:w-full [&_button]:border-border/60 [&_button]:duration-150 [&_button:hover]:border-primary/50 [&_button:hover]:bg-accent/60">
                  <ScrollArea>
                    <div className="flex max-h-[400px] flex-col gap-1.5 pr-1">
                      <form.Field name="tags">
                        {({ handleChange, state }: any) =>
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
                                      : state.value?.filter((t: string) => t !== tag.id),
                                  )
                                }
                                count={tagCounts[tag.id] || undefined}
                                label={tag.name}
                              />
                            ))
                        }
                      </form.Field>
                      {tagTypeTags?.filter((tag) => tagCounts[tag.id] > 0).length === 0 && (
                        <span className="px-3 py-2 text-xs text-muted-foreground">
                          {t("search.accordion.noTags")}
                        </span>
                      )}
                    </div>
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            );
          })}

        {showDeveloper && (
          <AccordionItem
            id="developer"
            className="border-border/60 transition-colors duration-150 data-open:bg-card/60"
          >
            <AccordionTrigger className="font-display px-3 py-2.5 text-sm font-semibold tracking-tight text-foreground transition-colors duration-150 hover:bg-accent/60 hover:text-primary hover:no-underline">
              {t("search.accordion.developer")}
            </AccordionTrigger>
            <AccordionContent className="px-1 pt-1 pb-2 tabular-nums">
              <form.Field name="developerDisplayName">
                {({ handleChange, state }: any) => (
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
          <AccordionItem
            id="publisher"
            className="border-border/60 transition-colors duration-150 data-open:bg-card/60"
          >
            <AccordionTrigger className="font-display px-3 py-2.5 text-sm font-semibold tracking-tight text-foreground transition-colors duration-150 hover:bg-accent/60 hover:text-primary hover:no-underline">
              {t("search.accordion.publisher")}
            </AccordionTrigger>
            <AccordionContent className="px-1 pt-1 pb-2 tabular-nums">
              <form.Field name="publisherDisplayName">
                {({ handleChange, state }: any) => (
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
          <AccordionItem
            id="seller"
            className="border-border/60 transition-colors duration-150 data-open:bg-card/60"
          >
            <AccordionTrigger className="font-display px-3 py-2.5 text-sm font-semibold tracking-tight text-foreground transition-colors duration-150 hover:bg-accent/60 hover:text-primary hover:no-underline">
              {t("search.accordion.seller")}
            </AccordionTrigger>
            <AccordionContent className="px-1 pt-1 pb-2">
              <form.Field name="seller">
                {({ handleChange, state }: any) => (
                  <QuerySearch
                    queryKey={["search", "items"]}
                    fetchItems={async (query) => {
                      return httpClient
                        .v1Get<
                          {
                            _id: string;
                            name: string;
                            createdAt: string;
                            updatedAt: string;
                          }[]
                        >("/multisearch/sellers", {
                          params: {
                            query,
                          },
                        })
                        .then((hits) =>
                          (Array.isArray(hits) ? hits : []).map((hit) => ({
                            id: hit._id,
                            name: hit.name,
                          })),
                        );
                    }}
                    name={t("components.search.sellers")}
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

      {(showPastGiveaways || showOnSale || showCodeRedemption || showBlockchain) && (
        <div className="flex flex-col gap-2">
          {showPastGiveaways && (
            <form.Field name="pastGiveaways">
              {({ handleChange, state }: any) => (
                <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/40 px-3 py-2 transition-colors duration-150 hover:border-primary/50 hover:bg-accent/60">
                  <Checkbox
                    id="pastGiveaways"
                    isSelected={Boolean(state.value)}
                    onChange={(value) => handleChange(Boolean(value))}
                  />
                  <label
                    htmlFor="pastGiveaways"
                    className="flex-1 cursor-pointer text-sm font-medium leading-none text-foreground/90 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t("search.checkboxes.pastGiveaways")}
                  </label>
                </div>
              )}
            </form.Field>
          )}

          {showOnSale && (
            <form.Field name="onSale">
              {({ handleChange, state }: any) => (
                <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/40 px-3 py-2 transition-colors duration-150 hover:border-primary/50 hover:bg-accent/60">
                  <Checkbox
                    id="onSale"
                    isSelected={Boolean(state.value)}
                    onChange={(value) => handleChange(Boolean(value))}
                  />
                  <label
                    htmlFor="onSale"
                    className="flex-1 cursor-pointer text-sm font-medium leading-none text-foreground/90 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t("search.checkboxes.onSale")}
                  </label>
                </div>
              )}
            </form.Field>
          )}

          {showCodeRedemption && (
            <form.Field name="isCodeRedemptionOnly">
              {({ handleChange, state }: any) => (
                <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/40 px-3 py-2 transition-colors duration-150 hover:border-primary/50 hover:bg-accent/60">
                  <Checkbox
                    id="isCodeRedemptionOnly"
                    isSelected={Boolean(state.value)}
                    onChange={(value) => handleChange(Boolean(value))}
                  />
                  <label
                    htmlFor="isCodeRedemptionOnly"
                    className="flex-1 cursor-pointer text-sm font-medium leading-none text-foreground/90 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t("search.checkboxes.codeRedemptionOnly")}
                  </label>
                </div>
              )}
            </form.Field>
          )}

          {showBlockchain && (
            <form.Field name="excludeBlockchain">
              {({ handleChange, state }: any) => (
                <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/40 px-3 py-2 transition-colors duration-150 hover:border-primary/50 hover:bg-accent/60">
                  <Checkbox
                    id="excludeBlockchain"
                    isSelected={Boolean(state.value)}
                    onChange={(value) => handleChange(Boolean(value))}
                  />
                  <label
                    htmlFor="excludeBlockchain"
                    className="flex-1 cursor-pointer text-sm font-medium leading-none text-foreground/90 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t("search.checkboxes.excludeBlockchain")}
                  </label>
                </div>
              )}
            </form.Field>
          )}
        </div>
      )}
    </aside>
  );
}
