import { createMiddleware } from "@tanstack/react-start";

export const loggingMiddleware = createMiddleware().server(async ({ next }) => {
  console.log("Request received");
  const result = await next();
  console.log("Response processed:", result);
  return result;
});
