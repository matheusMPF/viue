import { NextResponse } from 'next/server';
import type { ZodType } from 'zod';
import { ZodError } from 'zod';

import type { ApiError, ApiSuccess } from '@/types/auth';
import { AuthError } from './errors';

export function successResponse<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(error: unknown): NextResponse<ApiError> {
  if (error instanceof ZodError || error instanceof SyntaxError) {
    return NextResponse.json(
      { success: false, code: 'INVALID_REQUEST', message: 'Dados enviados são inválidos.' },
      { status: 400 },
    );
  }
  if (error instanceof AuthError) {
    return NextResponse.json(
      {
        success: false,
        code: error.code,
        message: error.message,
        ...error.details,
      },
      { status: error.status },
    );
  }

  console.error('Unhandled authentication error', error);
  return NextResponse.json(
    {
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Não foi possível concluir a solicitação.',
    },
    { status: 500 },
  );
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  return schema.parse(await request.json());
}
