import type { TypeOf } from "zod";
import { useTranslation } from "@/lib/paraglide-react";
import type { formSchema } from "@/stores/searchStore";
import type { FullTag } from "@/types/tags";
import type { SearchFacetSection } from "@/lib/v1-adapters";
import { Input } from "@/components/ui/input";
import { QuickPill } from "@/components/app/quick-pill";
import { Separator } from "@/components/ui/separator";
import { PriceRangeSlider } from "@/components/ui/price-range-slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckboxWithCount } from "@/components/app/checkbox-with-count";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExtendedSearch } from "@/components/app/extended-search";
import { Checkbox } from "@/components/ui/checkbox";
import { offersDictionary, offerTypeValues } from "@/lib/offers-dictionary";
import { Search } from "lucide-react";

export interface SearchFiltersProps {
  query: TypeOf<typeof formSchema>;
  setField: <K extends keyof TypeOf<typeof formSchema>>(
    field: K,
    value: TypeOf<typeof formSchema>[K],
  ) => void;
  loading: boolean;
  tags: FullTag[];
  tagTypes: { name: string; label: string }[];
  priceRange: { min: number; max: number; currency: string };
  offerTypeCounts: Record<string, number>;
  tagCounts: Record<string, number>;
  technologyCounts: Record<string, number>;
  developerCounts: Record<string, number>;
  publisherCounts: Record<string, number>;
  onFacetSectionOpen: (section: SearchFacetSection) => void;
  pendingFacetSections: SearchFacetSection[];
  controls: {
    showTitle: boolean;
    showTags: boolean;
    showTechnologies: boolean;
    showDeveloper: boolean;
    showPublisher: boolean;
    showOfferType: boolean;
    showOnSale: boolean;
    showCodeRedemption: boolean;
    showBlockchain: boolean;
    showPastGiveaways: boolean;
    showSeller: boolean;
    showPrice: boolean;
    showLowestPrice: boolean;
    showLowestPriceEver: boolean;
  };
}

const ACCORDION_FACET_SECTIONS: Record<string, SearchFacetSection> = {
  offerType: "offerType",
  technologies: "technologies",
  developer: "developer",
  publisher: "publisher",
};

function facetSectionForAccordionValue(value: string): SearchFacetSection | null {
  if (!value) return null;
  // Tag accordion values are tag group names, so anything unknown loads tags.
  return ACCORDION_FACET_SECTIONS[value] ?? "tags";
}

export function SearchFilters({
  query,
  setField,
  tags,
  tagTypes,
  priceRange,
  offerTypeCounts,
  tagCounts,
  technologyCounts,
  developerCounts,
  publisherCounts,
  controls,
  onFacetSectionOpen,
  pendingFacetSections,
}: SearchFiltersProps) {
  const { t } = useTranslation();
  const {
    showTitle,
    showTags,
    showTechnologies,
    showDeveloper,
    showPublisher,
    showOfferType,
    showOnSale,
    showCodeRedemption,
    showBlockchain,
    showPastGiveaways,
    showSeller,
    showPrice,
    showLowestPrice,
    showLowestPriceEver,
  } = controls;

  // Handlers for updating query
  const handleFieldChange = <K extends keyof TypeOf<typeof formSchema>>(
    field: K,
    value: TypeOf<typeof formSchema>[K],
  ) => {
    setField(field, value);
  };

  // For array fields like tags
  const handleArrayFieldChange = (field: keyof TypeOf<typeof formSchema>, value: string[]) => {
    setField(field, value as TypeOf<typeof formSchema>[typeof field]);
  };

  // Helper type guard for string array
  function isStringArray(val: unknown): val is string[] {
    return Array.isArray(val) && val.every((v) => typeof v === "string");
  }

  const hasSelectedFilters = Boolean(
    (showTags && isStringArray(query.tags) && query.tags.length > 0) ||
    (showTechnologies && isStringArray(query.technologies) && query.technologies.length > 0) ||
    (showDeveloper && query.developerDisplayName) ||
    (showPublisher && query.publisherDisplayName) ||
    (showOfferType && query.offerType) ||
    (showOnSale && query.onSale) ||
    (showCodeRedemption && query.isCodeRedemptionOnly) ||
    (showBlockchain && query.excludeBlockchain) ||
    (showSeller && query.seller) ||
    (showPastGiveaways && query.pastGiveaways),
  );

  return (
    <aside className="flex w-full flex-col gap-4 rounded-xl border border-white/10 bg-card/60 p-4">
      {showTitle && (
        <div className="relative">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/75"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder={t("search.filtersPlaceholder")}
            name="title"
            value={query.title || ""}
            className="h-10 rounded-lg border-border/70 bg-background/70 ps-9 text-sm transition-colors duration-150 focus-visible:border-primary/60"
            onChange={(e) =>
              handleFieldChange("title", e.target.value === "" ? undefined : e.target.value)
            }
          />
        </div>
      )}

      {/* Selected Filters Pills */}
      {hasSelectedFilters && (
        <>
          <div id="selected_filters" className="flex flex-row flex-wrap gap-1.5">
            {showTags &&
              (isStringArray(query.tags) ? query.tags : []).map((tag) => {
                const tagData = tags?.find((t) => t.id === tag);
                return (
                  <QuickPill
                    key={tag}
                    label={tagData?.name ?? tag}
                    onRemove={() => {
                      handleArrayFieldChange(
                        "tags",
                        (isStringArray(query.tags) ? query.tags : []).filter((t) => t !== tag),
                      );
                    }}
                  />
                );
              })}
            {showTechnologies &&
              (isStringArray(query.technologies) ? query.technologies : []).map((technology) => (
                <QuickPill
                  key={technology}
                  label={technology}
                  onRemove={() => {
                    handleArrayFieldChange(
                      "technologies",
                      (isStringArray(query.technologies) ? query.technologies : []).filter(
                        (value) => value !== technology,
                      ),
                    );
                  }}
                />
              ))}
            {showDeveloper && query.developerDisplayName && (
              <QuickPill
                label={query.developerDisplayName}
                onRemove={() => handleFieldChange("developerDisplayName", undefined)}
              />
            )}
            {showPublisher && query.publisherDisplayName && (
              <QuickPill
                label={query.publisherDisplayName}
                onRemove={() => handleFieldChange("publisherDisplayName", undefined)}
              />
            )}
            {showOfferType && query.offerType && (
              <QuickPill
                label={
                  offersDictionary[query.offerType as keyof typeof offersDictionary] ??
                  query.offerType
                }
                onRemove={() => handleFieldChange("offerType", undefined)}
              />
            )}
            {showOnSale && query.onSale && (
              <QuickPill
                label={t("search.pills.onSale")}
                onRemove={() => handleFieldChange("onSale", undefined)}
              />
            )}
            {showCodeRedemption && query.isCodeRedemptionOnly && (
              <QuickPill
                label={t("search.pills.codeRedemptionOnly")}
                onRemove={() => handleFieldChange("isCodeRedemptionOnly", undefined)}
              />
            )}
            {showBlockchain && query.excludeBlockchain && (
              <QuickPill
                label={t("search.pills.excludeBlockchain")}
                onRemove={() => handleFieldChange("excludeBlockchain", undefined)}
              />
            )}
            {showSeller && query.seller && (
              <QuickPill
                label={query.seller}
                onRemove={() => handleFieldChange("seller", undefined)}
              />
            )}
            {showPastGiveaways && query.pastGiveaways && (
              <QuickPill
                label={t("search.pills.pastGiveaways")}
                onRemove={() => handleFieldChange("pastGiveaways", undefined)}
              />
            )}
          </div>
          <Separator className="bg-border/50" />
        </>
      )}

      {showPrice && (
        <PriceRangeSlider
          min={priceRange.min}
          max={Math.min(priceRange.max, 1000)}
          step={1}
          defaultValue={[query.price?.min || priceRange.min, query.price?.max || priceRange.max]}
          onValueChange={(value) => {
            handleFieldChange("price", { min: value[0], max: value[1] });
          }}
          currency={priceRange.currency === "" ? "USD" : priceRange.currency}
        />
      )}

      <Accordion
        className="w-full"
        onExpandedChange={(keys) => {
          for (const key of keys) {
            const section = facetSectionForAccordionValue(String(key));
            if (section) {
              onFacetSectionOpen(section);
            }
          }
        }}
      >
        {showOfferType && (
          <AccordionItem id="offerType">
            <AccordionTrigger>{t("search.accordion.offerType")}</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-2 w-full mt-2">
              {offerTypeValues
                .map((key) => [key, offersDictionary[key]] as const)
                .filter(([key, value]) => value !== "Unknown" && offerTypeCounts[key] > 0)
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map(([key, value]) => (
                  <CheckboxWithCount
                    key={key}
                    checked={query.offerType === key}
                    onChange={(checked: boolean) =>
                      handleFieldChange("offerType", checked ? key : undefined)
                    }
                    count={offerTypeCounts[key] || undefined}
                    label={value}
                  />
                ))}
              {Object.keys(offerTypeCounts).length === 0 &&
                pendingFacetSections.includes("offerType") && (
                  <span className="text-muted-foreground px-4">{t("common.loading")}</span>
                )}
            </AccordionContent>
          </AccordionItem>
        )}

        {showTags &&
          tagTypes.map((tagType) => {
            const tagTypeTags = tags?.filter((tag) => tag.groupName === tagType.name);
            return (
              <AccordionItem key={tagType.name} id={tagType.name ?? "alltags"}>
                <AccordionTrigger>{tagType.label}</AccordionTrigger>
                <AccordionContent className="flex flex-col gap-2 mt-2">
                  <ScrollArea>
                    <div className="max-h-[400px] flex flex-col gap-1">
                      {tagTypeTags
                        ?.filter((tag) => tagCounts[tag.id] > 0)
                        .map((tag) => (
                          <CheckboxWithCount
                            key={tag.id}
                            checked={isStringArray(query.tags) && query.tags.includes(tag.id)}
                            onChange={(checked: boolean) => {
                              if (checked) {
                                handleArrayFieldChange("tags", [
                                  ...(isStringArray(query.tags) ? query.tags : []),
                                  tag.id,
                                ]);
                              } else {
                                handleArrayFieldChange(
                                  "tags",
                                  (isStringArray(query.tags) ? query.tags : []).filter(
                                    (t) => t !== tag.id,
                                  ),
                                );
                              }
                            }}
                            count={tagCounts[tag.id] || undefined}
                            label={tag.name}
                          />
                        ))}
                      {tagTypeTags?.filter((tag) => tagCounts[tag.id] > 0).length === 0 && (
                        <span className="text-muted-foreground px-4">
                          {pendingFacetSections.includes("tags")
                            ? t("common.loading")
                            : t("search.accordion.noTags")}
                        </span>
                      )}
                    </div>
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            );
          })}

        {showTechnologies && (
          <AccordionItem id="technologies">
            <AccordionTrigger>{t("search.accordion.technologies")}</AccordionTrigger>
            <AccordionContent className="mt-2 flex flex-col gap-2">
              <ScrollArea>
                <div className="flex max-h-[400px] flex-col gap-1">
                  {Object.entries(technologyCounts)
                    .filter(([, count]) => count > 0)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([technology, count]) => (
                      <CheckboxWithCount
                        key={technology}
                        checked={
                          isStringArray(query.technologies) &&
                          query.technologies.includes(technology)
                        }
                        onChange={(checked: boolean) => {
                          if (checked) {
                            handleArrayFieldChange("technologies", [
                              ...(isStringArray(query.technologies) ? query.technologies : []),
                              technology,
                            ]);
                          } else {
                            handleArrayFieldChange(
                              "technologies",
                              (isStringArray(query.technologies) ? query.technologies : []).filter(
                                (value) => value !== technology,
                              ),
                            );
                          }
                        }}
                        count={count}
                        label={technology}
                      />
                    ))}
                  {Object.values(technologyCounts).every((count) => count <= 0) && (
                    <span className="px-4 text-muted-foreground">
                      {pendingFacetSections.includes("technologies")
                        ? t("common.loading")
                        : t("search.accordion.noTechnologies")}
                    </span>
                  )}
                </div>
              </ScrollArea>
            </AccordionContent>
          </AccordionItem>
        )}

        {showDeveloper && (
          <AccordionItem id="developer">
            <AccordionTrigger>{t("search.accordion.developer")}</AccordionTrigger>
            <AccordionContent>
              {Object.keys(developerCounts).length === 0 &&
              !query.developerDisplayName &&
              pendingFacetSections.includes("developer") ? (
                <span className="text-muted-foreground px-4">{t("common.loading")}</span>
              ) : (
                (Object.keys(developerCounts).length > 0 || query.developerDisplayName) && (
                  <ExtendedSearch
                    name="developers"
                    items={Object.entries(developerCounts).map(([key, value]) => ({
                      id: key,
                      name: key,
                      count: value as number,
                    }))}
                    value={query.developerDisplayName}
                    setValue={(val) => handleFieldChange("developerDisplayName", val)}
                  />
                )
              )}
            </AccordionContent>
          </AccordionItem>
        )}

        {showPublisher && (
          <AccordionItem id="publisher">
            <AccordionTrigger>{t("search.accordion.publisher")}</AccordionTrigger>
            <AccordionContent>
              {Object.keys(publisherCounts).length === 0 &&
              !query.publisherDisplayName &&
              pendingFacetSections.includes("publisher") ? (
                <span className="text-muted-foreground px-4">{t("common.loading")}</span>
              ) : (
                (Object.keys(publisherCounts).length > 0 || query.publisherDisplayName) && (
                  <ExtendedSearch
                    name="publishers"
                    items={Object.entries(publisherCounts).map(([key, value]) => ({
                      id: key,
                      name: key,
                      count: value as number,
                    }))}
                    value={query.publisherDisplayName}
                    setValue={(val) => handleFieldChange("publisherDisplayName", val)}
                  />
                )
              )}
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Seller search can be implemented similarly if needed */}
      </Accordion>

      <div className="flex flex-col gap-1 border-t border-border/50 pt-3">
        {showPastGiveaways && (
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-muted/40">
            <Checkbox
              id="pastGiveaways"
              isSelected={Boolean(query.pastGiveaways)}
              onChange={(value) => handleFieldChange("pastGiveaways", value ? true : undefined)}
            />
            <label
              htmlFor="pastGiveaways"
              className="flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {t("search.checkboxes.pastGiveaways")}
            </label>
          </div>
        )}

        {showOnSale && (
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-muted/40">
            <Checkbox
              id="onSale"
              isSelected={!!query.onSale}
              onChange={(value) => handleFieldChange("onSale", value ? true : undefined)}
            />
            <label
              htmlFor="onSale"
              className="flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {t("search.checkboxes.onSale")}
            </label>
          </div>
        )}

        {showCodeRedemption && (
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-muted/40">
            <Checkbox
              id="isCodeRedemptionOnly"
              isSelected={!!query.isCodeRedemptionOnly}
              onChange={(value) =>
                handleFieldChange("isCodeRedemptionOnly", value ? true : undefined)
              }
            />
            <label
              htmlFor="isCodeRedemptionOnly"
              className="flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {t("search.checkboxes.codeRedemptionOnly")}
            </label>
          </div>
        )}

        {showBlockchain && (
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-muted/40">
            <Checkbox
              id="excludeBlockchain"
              isSelected={!!query.excludeBlockchain}
              onChange={(value) => handleFieldChange("excludeBlockchain", value ? true : undefined)}
            />
            <label
              htmlFor="excludeBlockchain"
              className="flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {t("search.checkboxes.excludeBlockchain")}
            </label>
          </div>
        )}

        {showLowestPrice && (
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-muted/40">
            <Checkbox
              id="isLowestPrice"
              isSelected={!!query.isLowestPrice}
              onChange={(value) => handleFieldChange("isLowestPrice", value ? true : undefined)}
            />
            <label
              htmlFor="isLowestPrice"
              className="flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {t("search.checkboxes.onlyHistoricalLows")}
            </label>
          </div>
        )}

        {showLowestPriceEver && (
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-muted/40">
            <Checkbox
              id="isLowestPriceEver"
              isSelected={!!query.isLowestPriceEver}
              onChange={(value) => handleFieldChange("isLowestPriceEver", value ? true : undefined)}
            />
            <label
              htmlFor="isLowestPriceEver"
              className="flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {t("search.checkboxes.onlyLowestPriceEver")}
            </label>
          </div>
        )}
      </div>
    </aside>
  );
}
