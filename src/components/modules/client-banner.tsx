import { Button } from "@/components/aria/button";
import { Link } from "@tanstack/react-router";
import { Download } from "lucide-react";

export function ClientBanner() {
  return (
    <div className="relative mx-auto w-full max-w-7xl overflow-hidden rounded-lg border border-stroke-default egd-brand-wash shadow-raised">
      <div className="relative z-10 px-6 py-6 md:px-8 md:py-8">
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-3xl flex-1">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-interactive">
              EGDATA Client
            </div>
            <h2 className="mb-3 font-montserrat text-2xl font-bold leading-tight text-text-primary md:text-3xl">
              Power the egdata.app builds database
            </h2>
            <p className="mb-4 text-lg font-semibold text-text-secondary">
              Help map every Epic Games Store build
            </p>
            <p className="mb-6 max-w-2xl text-base text-text-muted">
              Our lightweight Windows & macOS client scans your Epic Games Launcher installs and
              securely uploads <strong>only</strong> manifest files, chunk lists, and metadata to the
              open database.
            </p>
            <Button size="lg" asChild>
              <Link to="/downloads">
                <Download strokeWidth={3} className="mr-2 size-5" />
                Download for Windows & macOS
              </Link>
            </Button>
          </div>
          <img
            src="https://cdn.egdata.app/logo_simple_white_clean.png"
            alt="egdata logo"
            className="hidden size-28 shrink-0 opacity-90 lg:block"
          />
        </div>
      </div>
    </div>
  );
}
