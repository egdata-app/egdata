import { Link } from '@tanstack/react-router';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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
  const truncatedVersion = buildVersion
    ? truncateText(buildVersion, maxVersionLength)
    : '';

  const shouldShowTitleTooltip = title.length > maxTitleLength;
  const shouldShowVersionTooltip =
    buildVersion && buildVersion.length > maxVersionLength;
  const shouldShowTooltip = shouldShowTitleTooltip || shouldShowVersionTooltip;

  const fullText = buildVersion ? `${title} (${buildVersion})` : title;
  const displayText = (
    <>
      <span>{truncatedTitle}</span>
      {buildVersion && (
        <span className="text-gray-500"> ({truncatedVersion})</span>
      )}
    </>
  );

  return (
    <Link
      to="/builds/$id"
      params={{ id }}
      className={cn('pl-2 font-mono', className)}
    >
      {shouldShowTooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                'cursor-help',
                shouldShowTooltip &&
                  'underline decoration-dotted decoration-gray-500/50 underline-offset-4',
              )}
            >
              {displayText}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{fullText}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        displayText
      )}
    </Link>
  );
}
