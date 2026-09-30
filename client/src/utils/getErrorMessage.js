// The server sends { message: "..." } on most errors, but a few routes
// respond with a bare string, so handle both shapes.
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data
  if (typeof data === 'string' && data) return data
  if (typeof data?.message === 'string' && data.message) return data.message
  return fallback
}
