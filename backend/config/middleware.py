class NoCacheApiMiddleware:
    """
    Ensures every /api/ response tells the browser (and any intermediate
    proxy) never to cache it. Without this, browsers can cache redirect
    responses (301/308) more aggressively and for longer than most
    people expect, which can cause a client to keep "replaying" a stale
    redirect chain from disk cache even after the server-side issue that
    caused it has been fixed. This closes that off entirely.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith('/api/'):
            response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            response['Pragma'] = 'no-cache'
        return response
