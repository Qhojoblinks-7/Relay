const fs = require('fs');
const path = require('path');

const targetPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@stream-io',
  'video-react-native-sdk',
  'android',
  'src',
  'main',
  'java',
  'com',
  'streamvideo',
  'reactnative',
  'StreamVideoReactNativeModule.kt'
);

if (!fs.existsSync(targetPath)) {
  console.log('StreamVideoReactNativeModule.kt not found, skipping fix');
  process.exit(0);
}

let content = fs.readFileSync(targetPath, 'utf8');
const original = content;
content = content.replace(/ReactApplicationContext\.POWER_SERVICE/g, 'Context.POWER_SERVICE');

if (content !== original) {
  fs.writeFileSync(targetPath, content);
  console.log('Fixed POWER_SERVICE references in StreamVideoReactNativeModule.kt');
}
