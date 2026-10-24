import { Link } from "@/components/app/localized-link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "@/lib/paraglide-react";
import type { OfferRequirements, OfferRequirementsResult } from "@/types/offer-requirements";

const FIELD_ORDER = [
  "os",
  "cpu",
  "processor",
  "gpu",
  "graphics",
  "memory",
  "ram",
  "storage",
  "disk",
  "directx",
  "network",
  "soundCard",
  "additional",
];

function humanizeField(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatRequirementValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => formatRequirementValue(item))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    for (const preferred of ["name", "rawEvidence", "text", "value", "label"]) {
      const candidate = record[preferred];
      if (typeof candidate === "string" && candidate.trim()) return candidate;
      if (typeof candidate === "number") return String(candidate);
    }

    return Object.values(record)
      .map((item) => formatRequirementValue(item))
      .filter(Boolean)
      .join(", ");
  }
  return "";
}

function orderedFields(result: OfferRequirementsResult): string[] {
  const keys = new Set([
    ...Object.keys(result.requirements.minimum ?? {}),
    ...Object.keys(result.requirements.recommended ?? {}),
  ]);

  return [...keys].sort((a, b) => {
    const indexA = FIELD_ORDER.indexOf(a);
    const indexB = FIELD_ORDER.indexOf(b);

    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });
}

function PlatformRequirements({ result }: { result: OfferRequirementsResult }) {
  const { t, i18n } = useTranslation();
  const fields = orderedFields(result);

  if (fields.length === 0) return null;

  const fieldLabel = (key: string) => {
    const translationKey = `offerDetail.requirements.fields.${key}`;
    return i18n.exists(translationKey) ? t(translationKey) : humanizeField(key);
  };

  const cellValue = (tier: Record<string, unknown> | null, key: string) => {
    const value = tier?.[key];
    const formatted = formatRequirementValue(value);
    return formatted || t("offerDetail.common.na");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base font-bold">
          {result.platform === "windows"
            ? t("offerDetail.requirements.windows")
            : t("offerDetail.requirements.macos")}
        </span>
        {result.isInherited && (
          <span className="text-xs text-muted-foreground">
            {result.parentOfferId ? (
              <Link
                to="/{-$locale}/offers/$id"
                params={{ id: result.parentOfferId }}
                className="underline decoration-dotted underline-offset-4"
              >
                {t("offerDetail.requirements.inheritedFromBaseGame")}
              </Link>
            ) : (
              t("offerDetail.requirements.inheritedFromBaseGame")
            )}
          </span>
        )}
        {result.state === "stale" && (
          <span className="text-xs text-muted-foreground">
            ({t("offerDetail.requirements.staleNotice")})
          </span>
        )}
      </div>
      <div className="overflow-hidden rounded-lg border border-border/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px] md:w-[200px]" />
              <TableHead className="border-l border-l-border/10">
                {t("offerDetail.requirements.minimum")}
              </TableHead>
              <TableHead className="border-l border-l-border/10">
                {t("offerDetail.requirements.recommended")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field) => (
              <TableRow key={field}>
                <TableCell className="font-medium">{fieldLabel(field)}</TableCell>
                <TableCell className="border-l border-l-border/10">
                  {cellValue(result.requirements.minimum, field)}
                </TableCell>
                <TableCell className="border-l border-l-border/10">
                  {cellValue(result.requirements.recommended, field)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function hasOfferRequirements(requirements: OfferRequirements | null | undefined): boolean {
  if (!requirements) return false;

  return [requirements.windows, requirements.macos].some(
    (result) =>
      Boolean(result) && Boolean(result?.requirements.minimum || result?.requirements.recommended),
  );
}

export function OfferRequirementsCard({ requirements }: { requirements: OfferRequirements }) {
  const platforms = [requirements.windows, requirements.macos].filter(
    (result): result is OfferRequirementsResult =>
      Boolean(result) && Boolean(result?.requirements.minimum || result?.requirements.recommended),
  );

  if (platforms.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {platforms.map((result) => (
        <PlatformRequirements key={result.platform} result={result} />
      ))}
    </div>
  );
}
