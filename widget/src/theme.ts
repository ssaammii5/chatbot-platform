/**
 * widget/src/theme.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads tenant branding configuration and injects CSS custom properties
 * into the widget's Shadow DOM host element.
 *
 * Usage:
 *   import { applyTheme, TenantTheme } from './theme';
 *   applyTheme(hostElement, { primaryColor: '#6366f1', fontFamily: 'Inter' });
 */

export interface TenantTheme {
  /** Primary brand color — used for the FAB, header gradient, and user bubbles. */
  primaryColor?: string;
  /** Font family override. Falls back to system UI stack if not provided. */
  fontFamily?: string;
  /** Border radius for the chat window card. Defaults to 16px. */
  borderRadius?: string;
  /** FAB size in px. Defaults to 60px. */
  fabSize?: string;
  /** Custom widget title shown in the header when bot is active. */
  widgetTitle?: string;
  /** Custom subtitle / status text under the title. */
  widgetSubtitle?: string;
}

const DEFAULT_THEME: Required<TenantTheme> = {
  primaryColor: '#3b82f6',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
  borderRadius: '16px',
  fabSize: '60px',
  widgetTitle: 'AI Assistant',
  widgetSubtitle: 'Typically replies instantly',
};

/**
 * Applies a TenantTheme to the widget's Shadow DOM host element by setting
 * CSS custom properties on it. Values fall back to defaults for any missing keys.
 */
export function applyTheme(hostElement: HTMLElement | ShadowRoot, theme: TenantTheme = {}): void {
  const resolved = { ...DEFAULT_THEME, ...theme };

  const target =
    hostElement instanceof ShadowRoot
      ? (hostElement.host as HTMLElement)
      : hostElement;

  target.style.setProperty('--widget-primary', resolved.primaryColor);
  target.style.setProperty('--widget-font', resolved.fontFamily);
  target.style.setProperty('--widget-radius', resolved.borderRadius);
  target.style.setProperty('--widget-fab-size', resolved.fabSize);
  // Title / subtitle are exposed as data attributes so Svelte can read them
  target.dataset.widgetTitle = resolved.widgetTitle;
  target.dataset.widgetSubtitle = resolved.widgetSubtitle;
}

/**
 * Fetch tenant branding configuration from the NestJS backend.
 * Returns null if the request fails (widget degrades to defaults).
 */
export async function fetchTenantTheme(
  apiUrl: string,
  tenantId: string,
): Promise<TenantTheme | null> {
  try {
    const response = await fetch(`${apiUrl}/tenants/${tenantId}/branding`, {
      headers: { Accept: 'application/json' },
      // Short timeout — widget must not block page load
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      primaryColor: data.primaryColor,
      fontFamily: data.fontFamily,
      borderRadius: data.borderRadius,
      widgetTitle: data.widgetTitle,
      widgetSubtitle: data.widgetSubtitle,
    } as TenantTheme;
  } catch {
    // Non-fatal: use defaults if branding fetch fails
    return null;
  }
}
