import "server-only";

import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const readJson = async (request: Request): Promise<unknown> => {
  const mediaType = request.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  if (mediaType !== "application/json") {
    throw new HttpError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Content-Type must be application/json.",
    );
  }

  try {
    return await request.json();
  } catch {
    // An unreadable or malformed request body is a client error.
    throw new HttpError(
      400,
      "INVALID_JSON",
      "Request body must contain valid JSON.",
    );
  }
};

export const errorResponse = (error: unknown): Response => {
  const headers = { "Cache-Control": "no-store" };

  if (error instanceof ZodError) {
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed.",
          issues: error.issues.map((issue) => ({
            path: issue.path.map(String).join("."),
            message: issue.message,
          })),
        },
      },
      { status: 400, headers },
    );
  }

  if (error instanceof HttpError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status, headers },
    );
  }

  // Log the operation message, excluding database details, request data, or keys.
  console.error(
    "API request failed:",
    error instanceof Error ? error.message : "Unknown error.",
  );
  return Response.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong. Please try again.",
      },
    },
    { status: 500, headers },
  );
};
