// Build-time routing only. Browser code keeps using relative /api URLs.
export function websiteConfig(value) {
  let api;
  try { api = new URL(value); } catch { throw new Error('Set SPROUT_API_ORIGIN to the HTTPS Render API origin before building for Vercel.'); }
  if (api.protocol !== 'https:' || api.username || api.password || api.pathname !== '/' || api.search || api.hash ||
      api.hostname.includes('*') || api.hostname === 'localhost' || api.hostname === '[::1]' || /^[\d.]+$/.test(api.hostname)) {
    throw new Error('SPROUT_API_ORIGIN must be an HTTPS origin without credentials, a path, query or fragment.');
  }
  return {
    framework: 'vite',
    installCommand: 'cd .. && npm ci',
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    rewrites: [
      { source: '/api/:path*', destination: `${api.origin}/api/:path*` },
      { source: '/((?!api(?:/|$)).*)', destination: '/index.html' },
    ],
    headers: [{ source: '/api/:path*', headers: [
      { key: 'Cache-Control', value: 'no-store' },
      { key: 'CDN-Cache-Control', value: 'no-store' },
      { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
    ] }],
  };
}
