document.addEventListener('DOMContentLoaded', function () {
  const toc = document.getElementById('post-toc');
  const root = document.querySelector('.post-body');
  if (!toc || !root) return;

  const headings = root.querySelectorAll('h2, h3');
  if (!headings.length) {
    toc.innerHTML = '<div style="color:#5b6474;font-size:0.92rem;">No sections found</div>';
    return;
  }

  const used = new Map();

  headings.forEach((heading) => {
    const text = heading.textContent.trim();
    if (!text) return;

    if (!heading.id) {
      const base = text
        .toLowerCase()
        .replace(/['"]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const count = used.get(base) || 0;
      heading.id = count === 0 ? base : `${base}-${count + 1}`;
      used.set(base, count + 1);
    }

    const a = document.createElement('a');
    a.href = `#${heading.id}`;
    a.textContent = text;
    a.className = heading.tagName.toLowerCase() === 'h3' ? 'toc-h3' : 'toc-h2';
    toc.appendChild(a);
  });
});
