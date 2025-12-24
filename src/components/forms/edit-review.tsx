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
import type { SingleReview } from "@/types/reviews";
import { Loader, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { AlertDialogHeader } from "../ui/alert-dialog";

interface ReviewFormProps {
  setIsOpen: (isOpen: boolean) => void;
  offer: SingleOffer | undefined | null;
  previousReview: SingleReview;
}

const routeApi = getRouteApi("__root__");

export function EditReviewForm({ setIsOpen, offer, previousReview }: ReviewFormProps) {
  const { epicToken, session } = routeApi.useRouteContext();
  const [step, setStep] = useState(1);

  const postReviewMutation = useMutation({
    mutationKey: ["edit-review"],
    mutationFn: async (review: {
      rating: number;
      recommended: boolean;
      content: JSONContent;
      title: string;
      tags: string;
    }) => {
      const res = await httpClient.patch(`/offers/${previousReview.id}/reviews`, review, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${epicToken?.access_token}`,
        },
      });
      if (!res) throw new Error("Error submitting review");
      return { success: true };
    },
  });

  const deleteReviewMutation = useMutation({
    mutationKey: ["delete-review"],
    mutationFn: async () => {
      const res = await httpClient.delete(`/offers/${previousReview.id}/reviews`, {
        headers: { Authorization: `Bearer ${epicToken?.access_token}` },
      });
      if (!res) throw new Error("Error deleting review");
      return { success: true };
    },
  });

  const form = useForm({
    defaultValues: {
      ...previousReview,
      website: "",
      recommended: previousReview.recommended ? "yes" : "no",
      content:
        typeof previousReview.content !== "string"
          ? previousReview.content
          : {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: previousReview.content,
                    },
                  ],
                },
              ],
            },
      tags: previousReview.tags.join(","),
    },
    onSubmit: async ({ value }) => {
      consola.log("Submitting review", value);

      if (value.website) {
        consola.error("Spam detected", value.website);
        return { success: false, errors: { general: "Spam detected" } };
      }

      if ((!epicToken || !epicToken.access_token) && !session) {
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

  const handleDeleteReview = async () => {
    await deleteReviewMutation.mutateAsync();
    window.location.reload();
  };

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
      <Card className="w-full max-w-2xl mx-auto p-6 space-y-8 z-20 relative">
        <div className="absolute top-4 right-4">
          <DeleteReviewButton reviewId={previousReview.id} onDelete={handleDeleteReview} />
        </div>
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
            <CardTitle>Edit Review</CardTitle>
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

interface DeleteReviewButtonProps {
  reviewId: string;
  onDelete: (id: string) => Promise<void>;
}

function DeleteReviewButton({ reviewId, onDelete }: DeleteReviewButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(reviewId);
    } catch (error) {
      console.error(error);
      return;
    } finally {
      setIsDeleting(false);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="icon" aria-label="Delete review">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <AlertDialogHeader>
          <DialogTitle>Are you sure you want to delete this review?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the review from our servers.
          </DialogDescription>
        </AlertDialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? <Loader className="animate-spin" /> : null}
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
