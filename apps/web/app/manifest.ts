import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'mOS Lab — Wings Lashes CRM',
    short_name: 'mOS',
    description: 'Living Lab CRM Telesales & Spa Operations for Wings Lashes',
    start_url: '/dashboard/today',
    display: 'standalone',
    orientation: 'any',
    background_color: '#090d16',
    theme_color: '#090d16',
    icons: [
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
