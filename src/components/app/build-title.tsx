import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface BuildTitleProps {
  id: string;
  title: string;
  buildVersion?: string;
  className?: string;
  maxTitleLength?: number;
  maxVersionLength?: number;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function BuildTitle({
  id,
  title,
  buildVersion,
  className,
  maxTitleLength = 30,
  maxVersionLength = 10,
}: BuildTitleProps) {
  const truncatedTitle = truncateText(title, maxTitleLength);
  const truncatedVersion = buildVersion ? truncateText(buildVersion, maxVersionLength) : "";

  const displayText = (
    <>
      <span>{truncatedTitle}</span>
      {buildVersion && <span className="text-gray-500"> ({truncatedVersion})</span>}
    </>
  );

  return (
    <Link to="/builds/$id" params={{ id }} className={cn("pl-2 font-mono", className)}>
      {displayText}
    </Link>
  );
}
