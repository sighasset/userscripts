export function downloadFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function promptFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;

    input.onchange = () => {
      const file = input.files?.[0] || null;
      resolve(file);
      cleanup();
    };

    input.oncancel = () => {
      resolve(null);
      cleanup();
    };

    const handleWindowFocus = () => {
      window.removeEventListener('focus', handleWindowFocus);
      setTimeout(() => {
        if (!input.files || input.files.length === 0) {
          resolve(null);
          cleanup();
        }
      }, 300);
    };

    const cleanup = () => {
      input.onchange = null;
      input.oncancel = null;
      window.removeEventListener('focus', handleWindowFocus);
      input.remove();
    };

    window.addEventListener('focus', handleWindowFocus);

    input.style.display = 'none';
    document.body.appendChild(input);

    input.click();
  });
}
