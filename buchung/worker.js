// Öffentliche Buchungsseite: nur die Bio-Seite und die Buchungs-Weiterleitungen der App, sonst nichts.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let path = url.pathname;
    if (path === '/' || path === '') path = '/b';
    else if (path.startsWith('/go/')) path = '/b' + path;          // kurze Form: /go/treatwell
    if (path !== '/b' && path !== '/b/daten' && !/^\/b\/(go|bild|schrift)\//.test(path)) return Response.redirect(url.origin + '/', 302);
    const target = new URL(path + url.search, 'https://app.internal');
    return env.APP.fetch(new Request(target, { headers: request.headers, method: 'GET', redirect: 'manual' })); // Weiterleitung ans Handy durchreichen
  },
};
