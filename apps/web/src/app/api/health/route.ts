export function GET() {
  return Response.json({
    status: "ok",
    service: "note-guard-web",
    time: new Date().toISOString(),
  });
}
