import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/components/app/localized-link";
import { Download } from "lucide-react";
import { useTranslation } from "@/lib/paraglide-react";

export function ClientBanner() {
  const { t } = useTranslation();
  return (
    <section className="relative mx-auto w-full max-w-7xl overflow-hidden rounded-xl border border-border/60 bg-card/80 px-6 py-8 md:px-10 md:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -end-20 -top-24 size-80 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -start-16 size-64 rounded-full bg-slate-400/5 blur-3xl"
      />

      <div className="relative z-10 flex flex-col items-center justify-between gap-8 lg:flex-row">
        <div className="flex-1 text-center lg:text-start">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {t("components.clientBanner.heading", {
              appName: "egdata",
            })}
          </h2>

          <p className="mt-2.5 text-base font-medium text-foreground/90 md:text-lg">
            {t("components.clientBanner.subheading")}
          </p>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground lg:mx-0">
            {t("components.clientBanner.description")}
          </p>

          <div className="mt-6">
            <Link
              to="/{-$locale}/downloads"
              className={buttonVariants({
                size: "lg",
                className: "rounded-full px-6 font-semibold shadow-sm",
              })}
            >
              <Download className="me-2 size-4" />
              {t("components.clientBanner.cta")}
            </Link>
          </div>
        </div>

        <div className="shrink-0">
          <div className="flex size-32 items-center justify-center rounded-2xl border border-border/60 bg-background/60 p-6 shadow-sm md:size-40">
            <img
              src="https://cdn.egdata.app/logo_simple_white_clean.png"
              alt="egdata logo"
              className="size-20 object-contain md:size-24"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
