/** @type {import('next').NextConfig} */
console.log('--- NEXT.CONFIG.MJS ---');
console.log('CLERK_SECRET_KEY:', process.env.CLERK_SECRET_KEY ? 'EXISTS' : 'MISSING');
console.log('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'EXISTS' : 'MISSING');
console.log('-----------------------');

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
