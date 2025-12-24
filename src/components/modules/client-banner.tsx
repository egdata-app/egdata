import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Download } from "lucide-react";

export function ClientBanner() {
  return (
    <div className="relative w-full max-w-7xl mx-auto overflow-hidden rounded-2xl shadow-2xl">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#102744] via-[#1f3553] to-[#406179] animate-gradient-rotate" />

      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/25" />

      {/* Main Content */}
      <div className="relative z-10 px-6 py-6 md:px-8 md:py-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Left Content */}
          <div className="flex-1 text-center lg:text-left">
            {/* Main Heading */}
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 leading-tight">
              Power the{" "}
              <span className="bg-gradient-to-r from-[#4fa3ff] to-[#7ad3ff] bg-clip-text text-transparent">
                egdata.app
              </span>{" "}
              builds database
            </h1>

            {/* Subheading */}
            <p className="text-lg md:text-xl text-white/90 mb-4 font-medium">
              Help map every Epic&nbsp;Games Store build
            </p>

            {/* Description */}
            <p className="text-base text-white/80 mb-6 max-w-lg mx-auto lg:mx-0">
              Our lightweight Windows & macOS client scans your Epic Games Launcher installs and
              securely uploads <strong>only</strong> the manifest files—chunk lists and metadata—to
              our open database. Every upload enriches the community and helps us track changes over
              time.
            </p>

            {/* CTA Button */}
            <Button
              size="lg"
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold px-8 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 group"
              asChild
            >
              <Link to="/downloads">
                <Download strokeWidth={3} className="w-5 h-5 mr-2" />
                Download for Windows & macOS
              </Link>
            </Button>
          </div>

          {/* Right Visual Element */}
          <div className="flex-shrink-0">
            <div className="relative">
              {/* Main Circle */}
              <div className="w-40 h-40 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-gradient-to-br from-[#102744] to-[#406179] flex items-center justify-center shadow-2xl">
                  <img
                    src="https://cdn.egdata.app/logo_simple_white_clean.png"
                    alt="egdata logo"
                    className="size-24"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
