import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Truncates text to a specified maximum length and appends an ellipsis if truncated.
 * @param text - The text to truncate
 * @param maxLength - The maximum length of the text
 * @returns The truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}

/**
 * A React component that displays truncated text with a tooltip showing the full text.
 * @param text - The text to display
 * @param maxLength - The maximum length before truncation (default: 30)
 * @param className - Optional CSS classes
 */
export function TruncatedText({
  text,
  maxLength = 30,
  className = "",
}: {
  text: string;
  maxLength?: number;
  className?: string;
}) {
  const truncated = truncateText(text, maxLength);
  const isTruncated = text.length > maxLength;

  if (!isTruncated) {
    return <span className={className}>{text}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={className}>{truncated}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
