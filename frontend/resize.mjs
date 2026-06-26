import sharp from 'sharp';

async function run() {
  await sharp('public/pwa-192x192.png').resize(192, 192).toFormat('png').toFile('public/pwa-192x192-new.png');
  await sharp('public/pwa-512x512.png').resize(512, 512).toFormat('png').toFile('public/pwa-512x512-new.png');
  await sharp('public/screenshot.png').resize(1080, 1920).toFormat('png').toFile('public/screenshot-new.png');
  console.log('Done');
}

run();
