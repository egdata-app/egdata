import { useForm } from "@tanstack/react-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../ui/card";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Alert } from "../ui/alert";
import type { SingleOffer } from "@/types/single-offer";
import { useState } from "react";
import MotionNumber from "@number-flow/react";
import { Editor } from "../app/editor";
import type { JSONContent } from "@tiptap/react";
import { useMutation } from "@tanstack/react-query";
import { getRouteApi, redirect } from "@tanstack/react-router";
import { httpClient } from "@/lib/http-client";
import consola from "consola";
import { Viewer } from "../app/viewer";
import { Loader } from "lucide-react";

interface ReviewFormProps {
  setIsOpen: (isOpen: boolean) => void;
  offer: SingleOffer | undefined | null;
}

const defaultContent: JSONContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Please enter your review here",
        },
      ],
    },
  ],
};

const routeApi = getRouteApi("__root__");

export function ReviewForm({ setIsOpen, offer }: ReviewFormProps) {
  const { session } = routeApi.useRouteContext();
  const [step, setStep] = useState(1);

  const postReviewMutation = useMutation({
    mutationKey: ["post-review"],
    mutationFn: async (review: {
      rating: number;
      recommended: boolean;
      content: JSONContent;
      title: string;
      tags: string;
    }) => {
      const res = await httpClient.post(`/offers/${offer?.id}/reviews`, review, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!res) throw new Error("Error submitting review");
      return { success: true };
    },
  });

  const form = useForm({
    defaultValues: {
      rating: 5,
      recommended: undefined as undefined | "yes" | "no",
      title: "",
      content: defaultContent,
      tags: "",
      website: "",
    },
    onSubmit: async ({ value }) => {
      consola.log("Submitting review", value);

      if (value.website) {
        consola.error("Spam detected", value.website);
        return { success: false, errors: { general: "Spam detected" } };
      }

      if (!session) {
        throw redirect({ to: "/auth/login" });
      }

      try {
        await postReviewMutation.mutateAsync({
          rating: value.rating,
          recommended: value.recommended === "yes",
          content: value.content,
          title: value.title,
          tags: value.tags,
        });

        window.location.reload();
      } catch (error) {
        console.error(error);
        throw new Error("Error submitting review");
      }
    },
    validators: {
      onSubmit: ({ value }) => {
        if (!value.title) {
          return {
            fields: {
              title: "Title is required",
            },
          };
        }

        if (value.title.length < 3) {
          return {
            fields: {
              title: "Title must be at least 3 characters",
            },
          };
        }

        if (value.title.length > 75) {
          return {
            fields: {
              title: "Title must be less than 75 characters",
            },
          };
        }

        return {
          fields: {},
        };
      },
    },
  });

  const handleNextStep = () => {
    if (step < 3) setStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    if (step > 1) setStep((prev) => prev - 1);
  };

  const checkSubmitDisabled = (
    values:
      | boolean
      | {
          [key: string]: unknown;
        },
    canSubmit: boolean,
  ) => {
    if (typeof values === "boolean") {
      return !values;
    }

    if (step === 1) {
      return !values.recommended;
    }

    if (step === 2) {
      return !values.title;
    }

    return !canSubmit;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
      <div
        className="fixed inset-0 cursor-pointer"
        onClick={() => setIsOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setIsOpen(false);
          }
        }}
      />
      <Card className="w-full max-w-2xl mx-auto p-6 space-y-8 z-20">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Field name="website">
            {({ state, setValue, name }) => (
              <input
                hidden
                name={name}
                value={state.value}
                onChange={(e) => setValue(e.target.value)}
              />
            )}
          </form.Field>

          <CardHeader>
            <CardTitle>Submit a Review</CardTitle>
            <CardDescription>
              Share your thoughts about {offer?.title ?? "the product"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {form.state.errors.length > 0 &&
              form.state.errors.map((error, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: index is the only key
                <Alert key={index} variant="destructive">
                  {error}
                </Alert>
              ))}

            {step === 1 && (
              <div className="space-y-6">
                <form.Field
                  name="rating"
                  validators={{
                    onChange: ({ value }) =>
                      value < 1 || value > 10 ? "Rating must be between 1 and 10" : undefined,
                  }}
                >
                  {({ state, setValue, name }) => (
                    <div className="space-y-2">
                      <Label htmlFor="rating">Rating</Label>
                      <Slider
                        name={name}
                        id="rating"
                        min={0}
                        max={10}
                        step={1}
                        value={[state.value]}
                        onValueChange={(v) => setValue(v[0])}
                      />
                      <div className="text-center text-2xl font-bold">
                        <MotionNumber value={state.value} />
                      </div>
                    </div>
                  )}
                </form.Field>

                <form.Field
                  name="recommended"
                  validators={{
                    onChange: ({ value }) =>
                      value !== "yes" && value !== "no" ? "Please select yes or no" : undefined,
                  }}
                >
                  {({ state, name, handleChange }) => (
                    <div className="space-y-2">
                      <Label htmlFor="recommended">Would you recommend this product?</Label>
                      <RadioGroup
                        name={name}
                        value={state.value}
                        onValueChange={(v: "yes" | "no") => handleChange(v)}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes">Yes</RadioGroupItem>
                          <Label htmlFor="yes">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no">No</RadioGroupItem>
                          <Label htmlFor="no">No</Label>
                        </div>
                      </RadioGroup>
                      {state.meta.errors.map((error, index) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: index is the only key
                        <Alert key={index} variant="destructive">
                          {error}
                        </Alert>
                      ))}
                    </div>
                  )}
                </form.Field>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <form.Field
                  name="title"
                  validators={{
                    onChange: ({ value }) =>
                      value.length < 3
                        ? "Title must be at least 3 characters long"
                        : value.length > 75
                          ? "Title must be less than 75 characters"
                          : undefined,
                  }}
                >
                  {({ state, setValue, name }) => (
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        name={name}
                        value={state.value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Enter a title for your review"
                        required
                      />
                      {state.meta.errors.map((error, index) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: index is the only key
                        <Alert key={index} variant="destructive">
                          {error}
                        </Alert>
                      ))}
                    </div>
                  )}
                </form.Field>

                <form.Field
                  name="content"
                  validators={{
                    onChange: ({ value }) =>
                      value.length < 3 ? "Content must be at least 3 characters long" : undefined,
                  }}
                >
                  {({ state, setValue }) => (
                    <div className="space-y-2">
                      <Label htmlFor="content">Review Content</Label>
                      <Editor content={state.value} setContent={setValue} />
                    </div>
                  )}
                </form.Field>

                <form.Field name="tags">
                  {({ state, setValue, name }) => (
                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags (comma-separated)</Label>
                      <Input
                        id="tags"
                        name={name}
                        value={state.value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="e.g. quality, design, performance"
                      />
                    </div>
                  )}
                </form.Field>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-2">
                <Label htmlFor="review">Review Content</Label>
                <Viewer content={form.state.values.content} />
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-row justify-between">
            {step >= 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevStep}
                disabled={step === 1}
              >
                Previous
              </Button>
            )}
            <form.Subscribe
              selector={(formState) => [
                formState.isSubmitting,
                formState.canSubmit,
                formState.values,
              ]}
            >
              {([isSubmitting, canSubmit, values]) => (
                <Button
                  type={step === 3 ? "submit" : "button"}
                  disabled={checkSubmitDisabled(values, canSubmit as boolean)}
                  onClick={step === 3 ? undefined : handleNextStep}
                  key={`submit-review-${step}`}
                >
                  {isSubmitting ? <Loader className="animate-spin" /> : null}
                  {step >= 1 && step < 3 ? "Next" : "Submit Review"}
                </Button>
              )}
            </form.Subscribe>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
