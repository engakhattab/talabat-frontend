import { renderBootstrapFailure } from './bootstrap-failure';

describe('renderBootstrapFailure', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('app-root');
    document.body.replaceChildren(host);
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it('renders a meaningful heading, explanation, and reload action into the host', () => {
    renderBootstrapFailure();

    const fallback = document.getElementById('bootstrap-failure');
    expect(fallback).not.toBeNull();
    expect(fallback!.getAttribute('role')).toBe('alert');
    expect(fallback!.querySelector('h1')?.textContent).toContain('Something went wrong');
    expect(fallback!.querySelector('p')?.textContent).toContain('configuration');
    const reload = fallback!.querySelector('button');
    expect(reload?.textContent).toBe('Reload');
    expect(reload?.getAttribute('type')).toBe('button');
  });

  it('clears the previous host content before rendering the fallback', () => {
    host.textContent = 'leftover from the failed bootstrap';

    renderBootstrapFailure();

    expect(host.textContent).not.toContain('leftover from the failed bootstrap');
    expect(document.getElementById('bootstrap-failure')).not.toBeNull();
  });

  it('does not interpolate caught error text, tokens, or stack details', () => {
    renderBootstrapFailure();

    const text = document.body.textContent ?? '';
    expect(text).not.toContain('Error:');
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('at bootstrapApplication');
  });

  it('reloads the page when the reload action is invoked', () => {
    const originalLocation = window.location;
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadMock },
    });

    renderBootstrapFailure();
    (document.getElementById('bootstrap-failure')?.querySelector('button') as HTMLButtonElement).click();

    expect(reloadMock).toHaveBeenCalledOnce();

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('falls back to the body when no app-root host exists', () => {
    document.body.replaceChildren();

    renderBootstrapFailure();

    expect(document.body.textContent).toContain('Something went wrong');
    expect(document.getElementById('bootstrap-failure')).not.toBeNull();
  });
});
