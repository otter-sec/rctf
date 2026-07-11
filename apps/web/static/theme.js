// Pre-paint theme restore; loaded blocking from app.html so light-dark()
// resolves before first paint. Keep dependency-free and tiny.
;(() => {
  try {
    const theme = localStorage.getItem('theme')
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.dataset.theme = theme
    }
  } catch {
    // storage unavailable (private mode / disabled): fall back to system scheme
  }
})()
