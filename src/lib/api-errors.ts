import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export function normalizeApiError(error: unknown) {
  if (error instanceof ZodError) {
    return {
      message: "Invalid request payload.",
      status: 400,
      details: error.flatten(),
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      status: 500,
      details: undefined,
    };
  }

  return {
    message: "Unexpected server error.",
    status: 500,
    details: undefined,
  };
}
