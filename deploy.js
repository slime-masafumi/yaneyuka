const { execSync } = require('child_process');
const fs = require('fs');

console.log('Building Next.js application...');
try {
  execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}

console.log('\nDeploying to Firebase...');
try {
  execSync('firebase deploy --only hosting,firestore:rules', { stdio: 'inherit', cwd: __dirname });
  console.log('\nDeploy completed successfully!');
} catch (error) {
  console.error('Deploy failed:', error.message);
  process.exit(1);
}










































