import { NextResponse } from 'next/server';

/**
 * Standardized API success response
 * @param {*} data
 * @param {number} status
 */
export function apiSuccess(data, status = 200) {
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    return NextResponse.json({ success: true, ...data }, { status });
  }
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Standardized API error response
 * @param {string} message
 * @param {number} status
 */
export function apiError(message, status = 500) {
  return NextResponse.json({ success: false, error: message }, { status });
}
