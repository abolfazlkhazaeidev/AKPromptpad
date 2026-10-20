import { AppSettings, SystemThemeInfo } from '../../shared/types';

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

// Quick YIQ contrast check so custom accent buttons stay readable whether the user picks yellow or navy.
function getContrastTextColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#FFFFFF';
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return yiq >= 150 ? '#111215' : '#FFFFFF';
}

// Syncs current appearance preferences directly onto <html> dataset & CSS custom properties.
export function applyThemeToDocument(settings: AppSettings, systemTheme: SystemThemeInfo): void {
  const root = document.documentElement;

  // 1. Language & Direction (Persian = RTL, English = LTR)
  const isRtl = settings.language === 'fa';
  root.setAttribute('lang', settings.language);
  root.setAttribute('dir', isRtl ? 'rtl' : 'ltr');

  // 2. Theme Mode (Light / Dark / System)
  const effectiveDark =
    settings.theme === 'dark' ||
    (settings.theme === 'system' && systemTheme.shouldUseDarkColors);
  root.setAttribute('data-theme', effectiveDark ? 'dark' : 'light');

  // 3. Density & Reduced Motion
  root.setAttribute('data-density', settings.density);
  root.setAttribute('data-reduced-motion', String(Boolean(settings.reducedMotion)));

  // 4. Accent Color
  let primaryHex = effectiveDark ? '#E4E4E7' : '#18181B';
  if (settings.accentType === 'system' && systemTheme.systemAccentColor) {
    primaryHex = systemTheme.systemAccentColor;
  } else if (settings.accentType === 'custom' && settings.customAccentColor) {
    primaryHex = settings.customAccentColor;
  }

  const rgb = hexToRgb(primaryHex);
  const softRgba = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14)` : 'rgba(24, 24, 27, 0.1)';
  const onAccent = getContrastTextColor(primaryHex);

  root.style.setProperty('--accent-primary', primaryHex);
  root.style.setProperty('--accent-hover', primaryHex);
  root.style.setProperty('--accent-soft', softRgba);
  root.style.setProperty('--text-on-accent', onAccent);
  root.style.setProperty('--border-focus', primaryHex);
}
