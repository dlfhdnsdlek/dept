(() => {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('fetch', event =>
    event.respondWith(
      caches.match(event.request).then(
        res =>
          res ||
          fetch(event.request)
            .then(res => res)
            .catch(() => null),
      ),
    ),
  );
})();
