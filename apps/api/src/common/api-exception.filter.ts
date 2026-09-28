import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Response } from "express";

interface HttpExceptionLike {
  getStatus(): number;
  getResponse(): unknown;
}

function isHttpExceptionLike(value: unknown): value is HttpExceptionLike {
  return Boolean(
    value &&
      typeof value === "object" &&
      "getStatus" in value &&
      typeof value.getStatus === "function" &&
      "getResponse" in value &&
      typeof value.getResponse === "function",
  );
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const prismaStatus =
      exception instanceof Prisma.PrismaClientKnownRequestError
        ? exception.code === "P2002"
          ? HttpStatus.CONFLICT
          : exception.code === "P2025"
            ? HttpStatus.NOT_FOUND
            : HttpStatus.BAD_REQUEST
        : undefined;
    const status: number =
      exception instanceof HttpException || isHttpExceptionLike(exception)
        ? exception.getStatus()
        : (prismaStatus ?? HttpStatus.INTERNAL_SERVER_ERROR);
    if (status === Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }
    const payload: unknown =
      exception instanceof HttpException || isHttpExceptionLike(exception)
        ? exception.getResponse()
        : null;
    const objectPayload =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : {};
    const rawMessage =
      objectPayload.message ??
      (prismaStatus
        ? "Database constraint rejected the request"
        : exception instanceof Error
          ? exception.message
          : "Unexpected error");
    const message = Array.isArray(rawMessage)
      ? rawMessage
          .map((item) =>
            typeof item === "string" ? item : "Validation failed",
          )
          .join("; ")
      : typeof rawMessage === "string"
        ? rawMessage
        : "Request failed";
    response.status(status).json({
      success: false,
      data: null,
      message: status === 500 ? "An unexpected error occurred" : message,
      error: {
        code:
          typeof objectPayload.error === "string"
            ? objectPayload.error.toUpperCase().replaceAll(" ", "_")
            : `HTTP_${status}`,
        details: status === 500 ? {} : objectPayload,
      },
    });
  }
}
