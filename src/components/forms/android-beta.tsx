import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Loader, Users } from "lucide-react";
import {
  GoogleOAuthProvider,
  GoogleLogin,
  type CredentialResponse,
} from "@react-oauth/google";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

interface RegistrationState {
  status: "idle" | "loading" | "success" | "error" | "already_registered";
  error?: string;
  email?: string;
}

interface BetaStatus {
  registered: number;
  remaining: number;
  maxTesters: number;
  isFull: boolean;
}

export function AndroidBetaForm() {
  const [state, setState] = useState<RegistrationState>({ status: "idle" });
  const [betaStatus, setBetaStatus] = useState<BetaStatus | null>(null);

  useEffect(() => {
    fetch("/api/android-beta/status")
      .then((res) => res.json())
      .then((data) => setBetaStatus(data))
      .catch(() => setBetaStatus(null));
  }, []);

  const handleGoogleSuccess = useCallback(
    async (credentialResponse: CredentialResponse) => {
      if (!credentialResponse.credential) {
        setState({
          status: "error",
          error: "No credential received from Google",
        });
        return;
      }

      setState({ status: "loading" });

      try {
        const response = await fetch("/api/android-beta/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idToken: credentialResponse.credential,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 409) {
            setState({ status: "already_registered", email: data.email });
          } else {
            setState({
              status: "error",
              error: data.message || "Registration failed",
            });
          }
          return;
        }

        setState({ status: "success", email: data.email });
        // Update the count after successful registration
        if (betaStatus) {
          setBetaStatus({
            ...betaStatus,
            registered: betaStatus.registered + 1,
            remaining: betaStatus.remaining - 1,
          });
        }
      } catch (err) {
        console.error("Registration error:", err);
        setState({
          status: "error",
          error: "Something went wrong. Please try again.",
        });
      }
    },
    [betaStatus],
  );

  const handleGoogleError = useCallback(() => {
    setState({
      status: "error",
      error: "Google Sign-In failed. Please try again.",
    });
  }, []);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join the Beta</CardTitle>
          <CardDescription>
            Sign in with Google to register for the closed beta. We only need
            your email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {betaStatus && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pb-2">
              <Users className="h-4 w-4" />
              <span>
                <strong>{betaStatus.remaining}</strong> of {betaStatus.maxTesters} spots remaining
              </span>
            </div>
          )}

          {betaStatus?.isFull ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Beta is Full</AlertTitle>
              <AlertDescription>
                All {betaStatus.maxTesters} spots have been taken. Check back later
                or follow us for updates on when more spots become available.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {state.status === "idle" && (
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    useOneTap={false}
                    theme="filled_black"
                    size="large"
                    text="signin_with"
                    shape="rectangular"
                  />
                </div>
              )}

              {state.status === "loading" && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader className="animate-spin h-5 w-5" />
                  <span>Registering you for the beta...</span>
                </div>
              )}

              {state.status === "success" && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>You are registered!</AlertTitle>
                  <AlertDescription>
                    <p>
                      We have registered <strong>{state.email}</strong> for the
                      closed beta.
                    </p>
                    <p className="mt-2">
                      It may take a few hours until you are manually added to the
                      testers list. Once added, you can join the beta here:
                    </p>
                    <a
                      href="https://play.google.com/apps/testing/com.ignacioaldama.egdata"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-blue-500 hover:underline"
                    >
                      Join the Beta on Google Play
                    </a>
                  </AlertDescription>
                </Alert>
              )}

              {state.status === "already_registered" && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Already Registered</AlertTitle>
                  <AlertDescription>
                    <p>
                      <strong>{state.email}</strong> is already registered for the
                      beta.
                    </p>
                    <p className="mt-2">
                      If you have already been added to the testers list, you can
                      join the beta here:
                    </p>
                    <a
                      href="https://play.google.com/apps/testing/com.ignacioaldama.egdata"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-blue-500 hover:underline"
                    >
                      Join the Beta on Google Play
                    </a>
                  </AlertDescription>
                </Alert>
              )}

              {state.status === "error" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    <p>{state.error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setState({ status: "idle" })}
                    >
                      Try Again
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </GoogleOAuthProvider>
  );
}
