const fs = require('fs');
const path = require('path');

// Create directories
const dirs = [
  'convex',
  'components/ui',
  'components/chat',
  'components/sidebar',
  'components/providers',
  'lib',
  'hooks',
  'types',
  'app/(auth)/sign-in/[[...sign-in]]',
  'app/(auth)/sign-up/[[...sign-up]]',
  'app/(protected)/conversations/[id]',
];

dirs.forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
  console.log(`Created directory: ${dir}`);
});

console.log('\n✅ Directory structure created!');
console.log('\nNext steps:');
console.log('1. Run: npx convex dev');
console.log('2. Copy all the code files from my previous message');
console.log('3. Add your environment variables to .env.local');
console.log('4. Run: npm run dev');