/**
 * Ce serveur n'utilise PAS OAuth : le lien secret de l'agent fait office d'authentification.
 * Quand un client MCP cherche la « découverte OAuth » (/.well-known/…, /register, /authorize, /token), il doit recevoir
 * un 404 JSON net (« non pris en charge »), et non la page de connexion du CRM ni du HTML, qui lui font déclarer une erreur d'inscription OAuth.
 */
export const noOAuth = (req: Request) => {
  // Journal de diagnostic (aucun secret) : qui cherche la découverte OAuth, et avec quelle méthode.
  { try { const u = new URL(req.url); console.log(JSON.stringify({ evt: "oauth_probe", method: req.method, path: u.pathname.replace(/[0-9a-f]{64}/g, "<jeton>"), ua: (req.headers.get("user-agent") ?? "").slice(0, 80) })); } catch {} }
  return Response.json(
    { error: "not_found", error_description: "Ce serveur n'utilise pas OAuth : l'authentification est le lien secret de l'agent, dans l'adresse du connecteur." },
    { status: 404, headers: { "cache-control": "no-store", "x-robots-tag": "noindex" } }
  );
};
