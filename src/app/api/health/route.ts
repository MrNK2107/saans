/** Liveness probe for the host. Reveals nothing about configuration. */
export function GET() {
  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
