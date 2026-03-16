export function generateInterceptorScript(): string {
  return `(function() {
  const _fetch = window.fetch;
  const _cache = {};

  function loadJson(path) {
    if (_cache[path]) {
      return _cache[path];
    }
    _cache[path] = _fetch.call(window, path).then(function(r) {
      if (!r.ok) {
        return null;
      }
      return r.json();
    });
    return _cache[path];
  }

  function jsonResponse(data, status) {
    return new Response(JSON.stringify(data), {
      status: status || 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  function toStaticPath(pathname) {
    const p = pathname.replace(/^\\/api\\//, '');
    return '/api-data/' + p + '.json';
  }

  function handleLeaderboardWithGraph(params) {
    return loadJson('/api-data/v2/leaderboard/dump.json').then(function(dump) {
      if (!dump) {
        return jsonResponse({ kind: 'badEndpoint', message: 'Not available in archive.', data: null }, 404);
      }

      const limit = parseInt(params.get('limit') || '100', 10);
      const offset = parseInt(params.get('offset') || '0', 10);
      const division = params.get('division');
      const search = params.get('search');

      let filtered = dump.leaderboard;
      if (division) {
        filtered = filtered.filter(function(e) { return e.division === division; });
      }
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(function(e) { return e.name.toLowerCase().indexOf(s) !== -1; });
      }

      const total = filtered.length;
      const sliced = filtered.slice(offset, offset + limit);
      const ids = {};
      sliced.forEach(function(e) { ids[e.id] = true; });
      const graph = dump.graph.filter(function(g) { return ids[g.id]; });

      return jsonResponse({
        kind: 'goodLeaderboardWithGraph',
        message: 'The leaderboard with graph was retrieved.',
        data: { total: total, leaderboard: sliced, graph: graph }
      });
    });
  }

  function handleLeaderboardNow(params) {
    return loadJson('/api-data/v2/leaderboard/dump.json').then(function(dump) {
      if (!dump) {
        return jsonResponse({ kind: 'badEndpoint', message: 'Not available in archive.', data: null }, 404);
      }

      const limit = parseInt(params.get('limit') || '100', 10);
      const offset = parseInt(params.get('offset') || '0', 10);
      const division = params.get('division');
      const search = params.get('search');

      let filtered = dump.leaderboard;
      if (division) {
        filtered = filtered.filter(function(e) { return e.division === division; });
      }
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(function(e) { return e.name.toLowerCase().indexOf(s) !== -1; });
      }

      const total = filtered.length;
      const sliced = filtered.slice(offset, offset + limit);

      return jsonResponse({
        kind: 'goodLeaderboard',
        message: 'The leaderboard was retrieved.',
        data: { total: total, leaderboard: sliced }
      });
    });
  }

  function handleLeaderboardGraph(params) {
    return loadJson('/api-data/v2/leaderboard/dump.json').then(function(dump) {
      if (!dump) {
        return jsonResponse({ kind: 'badEndpoint', message: 'Not available in archive.', data: null }, 404);
      }

      const limit = parseInt(params.get('limit') || '100', 10);
      const offset = parseInt(params.get('offset') || '0', 10);
      const division = params.get('division');

      let filtered = dump.leaderboard;
      if (division) {
        filtered = filtered.filter(function(e) { return e.division === division; });
      }

      const sliced = filtered.slice(offset, offset + limit);
      const ids = {};
      sliced.forEach(function(e) { ids[e.id] = true; });
      const graph = dump.graph.filter(function(g) { return ids[g.id]; });

      return jsonResponse({
        kind: 'goodLeaderboardGraph',
        message: 'The leaderboard graph was retrieved.',
        data: { graph: graph }
      });
    });
  }

  function handleChallSolves(challId, params) {
    return loadJson('/api-data/v2/challs/' + challId + '/solves.json').then(function(dump) {
      if (!dump) {
        return jsonResponse({ kind: 'badEndpoint', message: 'Not available in archive.', data: null }, 404);
      }

      const limit = parseInt(params.get('limit') || '100', 10);
      const offset = parseInt(params.get('offset') || '0', 10);
      const sliced = dump.solves.slice(offset, offset + limit);

      return jsonResponse({
        kind: 'goodChallengeSolves',
        message: 'The challenges solves have been retrieved.',
        data: { solves: sliced, mySolvePosition: null }
      });
    });
  }

  window.fetch = function(input, init) {
    const url = new URL(
      typeof input === 'string' ? input : input instanceof Request ? input.url : input.href,
      location.origin
    );
    const method = ((init && init.method) || 'GET').toUpperCase();

    if (!url.pathname.startsWith('/api/')) {
      return _fetch.apply(this, arguments);
    }

    if (method !== 'GET') {
      return Promise.resolve(jsonResponse(
        { kind: 'badEndpoint', message: 'This is a read-only archive.', data: null },
        405
      ));
    }

    if (url.pathname === '/api/v2/integrations/analytics/script') {
      return Promise.resolve(new Response('', { status: 404 }));
    }

    const params = url.searchParams;

    if (url.pathname === '/api/v2/leaderboard/with-graph') {
      return handleLeaderboardWithGraph(params);
    }
    if (url.pathname === '/api/v2/leaderboard/now') {
      return handleLeaderboardNow(params);
    }
    if (url.pathname === '/api/v2/leaderboard/graph') {
      return handleLeaderboardGraph(params);
    }

    const solvesMatch = url.pathname.match(/^\\/api\\/v2\\/challs\\/([^\\/]+)\\/solves$/);
    if (solvesMatch) {
      return handleChallSolves(solvesMatch[1], params);
    }

    const staticPath = toStaticPath(url.pathname);
    return _fetch.call(this, staticPath).then(function(r) {
      return r.ok
        ? new Response(r.body, { status: 200, headers: { 'Content-Type': 'application/json' } })
        : jsonResponse(
            { kind: 'badEndpoint', message: 'Not available in archive.', data: null },
            404
          );
    });
  };
})()`
}
