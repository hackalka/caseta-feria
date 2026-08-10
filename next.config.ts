import type { NextConfig } from 'next';

const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';
const nextConfig: NextConfig = {
  typedRoutes: true,
  output: 'export',
  basePath: isGitHubPages ? '/caseta-feria' : '',
  assetPrefix: isGitHubPages ? '/caseta-feria/' : ''
};
export default nextConfig;
