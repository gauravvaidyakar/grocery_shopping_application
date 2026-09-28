import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from "@nestjs/common";
import { Observable, map } from "rxjs";

export interface ApiResult<T> {
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T | ApiResult<T>>,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((value) => {
        if (value instanceof StreamableFile) return value;
        if (value && typeof value === "object" && "data" in value) {
          const result = value;
          return {
            success: true,
            data: result.data,
            message: result.message ?? "Operation successful",
            meta: result.meta ?? {},
          };
        }
        return {
          success: true,
          data: value ?? null,
          message: "Operation successful",
          meta: {},
        };
      }),
    );
  }
}
