import { Link } from "@tanstack/react-router";
import { Button } from "../ui/button";
import { Card, CardContent, CardTitle, CardDescription } from "../ui/card";
import { useCookiesContext } from "@/hooks/use-app-cookies";

export function CookieBanner() {
  const { acceptCookies, declineCookies } = useCookiesContext();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col items-center gap-4 md:flex-row pt-4">
          <CookieIcon className="h-12 w-12 text-muted-foreground md:mr-4" />
          <div className="flex-1 space-y-2">
            <CardTitle className="text-lg font-semibold">Cookie Notice</CardTitle>
            <CardDescription className="text-muted-foreground">
              This website uses cookies to enhance your browsing experience. By accepting cookies,
              you accept our{" "}
              <Link to="/privacy" className="underline">
                Privacy Policy
              </Link>
              .
            </CardDescription>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Button size="sm" onClick={acceptCookies}>
              Accept
            </Button>
            <Button variant="outline" size="sm" onClick={declineCookies}>
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CookieIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
      <path d="M8.5 8.5v.01" />
      <path d="M16 15.5v.01" />
      <path d="M12 12v.01" />
      <path d="M11 17v.01" />
      <path d="M7 14v.01" />
    </svg>
  );
}
