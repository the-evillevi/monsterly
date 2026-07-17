import { describe, expect, it } from 'vitest';

import { webManifest } from './web-manifest';

const hexColorPattern = /^#[0-9a-f]{6}$/;

describe('web manifest', () => {
  it('identifies the installable app', () => {
    expect(webManifest.name).toBe('MythOS');
    expect(webManifest.short_name).toBe('MythOS');
    expect(webManifest.display).toBe('standalone');
    expect(webManifest.start_url).toBe('/');
    expect(webManifest.scope).toBe('/');
  });

  it('uses hex theme colors', () => {
    expect(webManifest.theme_color).toMatch(hexColorPattern);
    expect(webManifest.background_color).toMatch(hexColorPattern);
  });

  it('provides the icons Chrome installability requires', () => {
    const anyIcons = webManifest.icons.filter((icon) => icon.purpose === 'any');

    expect(anyIcons.map((icon) => icon.sizes)).toEqual(
      expect.arrayContaining(['192x192', '512x512']),
    );
    expect(webManifest.icons.every((icon) => icon.type === 'image/png')).toBe(true);
    expect(webManifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  });
});
