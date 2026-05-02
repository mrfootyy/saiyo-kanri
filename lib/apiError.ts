export type ApiErrorResponse = {
  error: string;
  status: number;
};

export function apiError(message: string, status: number): Response {
  return Response.json({ error: message } satisfies { error: string }, { status });
}
