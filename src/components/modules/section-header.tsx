import { Link } from "@/components/app/localized-link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useTranslation } from "@/lib/paraglide-react";

interface SectionHeaderProps {
  title: string;
  children?: ReactNode;
  href?: string;
  search?: unknown;
  params?: Record<string, unknown>;
  className?: string;
}

export function SectionHeader({
  title,
  children,
  href,
  search,
  params,
  className,
}: SectionHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className={cn("flex items-center justify-between gap-4 mb-4", className)}>
      <h2 className="text-lg font-display font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="flex items-center gap-3">
        {children}
        {href && (
          <Link
            to={href}
            search={search}
            params={params}
            className="inline-flex items-center gap-1 text-sm text-primary font-medium hover:text-primary/80 transition-colors"
          >
            {t("components.sectionHeader.seeAll")}
            <ArrowRight className="size-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
