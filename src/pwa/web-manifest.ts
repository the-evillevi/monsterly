export const webManifest = {
  name: 'Monsterly',
  short_name: 'Monsterly',
  description: 'Monsterly helps gyms and CrossFit boxes track subscriber payment status.',
  display: 'standalone' as const,
  start_url: '/',
  scope: '/',
  theme_color: '#1f5f26',
  background_color: '#f2f8e9',
  icons: [
    {
      src: '/icons/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/icon-maskable-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
};
