const BOOTSTRAP_FALLBACK_SELECTOR = 'app-root';

export function renderBootstrapFailure(): void {
  const host = document.querySelector(BOOTSTRAP_FALLBACK_SELECTOR);
  if (host) {
    host.innerHTML = '';
  }

  const fallback = document.createElement('div');
  fallback.setAttribute('role', 'alert');
  fallback.setAttribute('aria-live', 'assertive');
  fallback.id = 'bootstrap-failure';

  const heading = document.createElement('h1');
  heading.textContent = 'Something went wrong while starting the app';

  const explanation = document.createElement('p');
  explanation.textContent =
    'The application could not load its configuration. Reload the page to try again.';

  const reload = document.createElement('button');
  reload.type = 'button';
  reload.textContent = 'Reload';
  reload.addEventListener('click', () => window.location.reload());

  fallback.append(heading, explanation, reload);

  if (host) {
    host.replaceChildren(fallback);
  } else {
    document.body.replaceChildren(fallback);
  }
}
