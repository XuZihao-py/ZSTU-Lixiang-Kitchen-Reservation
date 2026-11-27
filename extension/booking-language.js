(() => {
  const [route, search] = location.hash.split('?');
  if (!route.startsWith('#/featuredStalls/roomReserve/') ||
      new URLSearchParams(search).get('spaceType') !== '2') return;

  function preserveOriginalText() {
    if (document.documentElement) document.documentElement.translate = false;
    if (!document.head) return false;

    // A Chrome-translated picker can keep old labels after the calendar grid updates.
    const meta = document.createElement('meta');
    meta.name = 'google';
    meta.content = 'notranslate';
    document.head.append(meta);
    return true;
  }

  if (preserveOriginalText()) return;
  const observer = new MutationObserver(() => {
    if (preserveOriginalText()) observer.disconnect();
  });
  observer.observe(document, { childList: true, subtree: true });
})();
