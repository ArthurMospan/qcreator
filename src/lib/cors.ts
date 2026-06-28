import { NextResponse } from 'next/server';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function corsHeaders() {
  return CORS;
}

export function optionsResponse() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export function withCors(res: NextResponse): NextResponse {
  Object.entries(CORS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}
