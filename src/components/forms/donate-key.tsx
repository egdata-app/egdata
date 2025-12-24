import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { httpClient } from "@/lib/http-client";
import consola from "consola";
import { AlertCircle, CheckCircle, Loader } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

export function DonateKeyForm() {
  const [key, setKey] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [id, setId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    setSending(true);
    setError("");
    setSuccess(false);
    e.preventDefault();

    try {
      const res = await httpClient.post<{
        message: string;
        id: string;
      }>(`/donate/key/${key}`, {});
      consola.info("Key donated");
      setSuccess(true);
      setId(res.id);
    } catch (error) {
      consola.error(error);
      setError(error.response ?? "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mx-auto">
      <div className="flex justify-center">
        <InputOTP
          maxLength={20}
          value={key}
          onChange={(e) => setKey(e)}
          onPaste={(e) => {
            e.preventDefault();
            setKey(e.clipboardData.getData("text").replaceAll("-", ""));
          }}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={5} />
            <InputOTPSlot index={6} />
            <InputOTPSlot index={7} />
            <InputOTPSlot index={8} />
            <InputOTPSlot index={9} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={10} />
            <InputOTPSlot index={11} />
            <InputOTPSlot index={12} />
            <InputOTPSlot index={13} />
            <InputOTPSlot index={14} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={15} />
            <InputOTPSlot index={16} />
            <InputOTPSlot index={17} />
            <InputOTPSlot index={18} />
            <InputOTPSlot index={19} />
          </InputOTPGroup>
        </InputOTP>
      </div>
      <div className="flex justify-center space-x-2">
        <Button type="submit" disabled={key.length !== 20 || sending}>
          {sending ?? <Loader className="animate-spin" />}
          Donate
        </Button>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{typeof error === "string" ? error : error.error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription className="flex flex-col gap-1">
            <p>
              Thank you for your donation! The item has been redeemed correctly and it's data will
              be available soon.
            </p>
            <p>
              You can check the item details on the{" "}
              <a
                href={`/offers/${id}`}
                className="text-blue-600 underline underline-offset-4 decoration-dotted decoration-blue-600/50 hover:underline"
              >
                Offer page
              </a>
              .
            </p>
          </AlertDescription>
        </Alert>
      )}
    </form>
  );
}
