export const dynamic = "force-dynamic";
const nope = () => Response.json({ error: "not_found" }, { status: 404, headers: { "cache-control": "no-store" } });
export const GET = nope;
export const POST = nope;
