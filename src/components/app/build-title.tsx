import { Link } from "@/components/app/localized-link";
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
      {buildVersion && <span className="text-muted-foreground"> ({truncatedVersion})</span>}
    </>
  );

  return (
    <Link to="/{-$locale}/builds/$id" params={{ id }} className={cn("pl-2 font-mono", className)}>
      {displayText}
    </Link>
  );
}
