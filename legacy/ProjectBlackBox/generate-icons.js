const { createICO } = require('png-to-ico');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  try {
    console.log('Generating icons from PNG...');
    
    // Source PNG path
    const pngPath = path.join(__dirname, 'assets', 'icon.png');
    
    // Generate ICO file for Windows
    const icoBuffer = await createICO([pngPath], {
      sizes: [16, 24, 32, 48, 64, 128, 256],
      resize: true
    });
    
    // Save ICO file
    fs.writeFileSync(path.join(__dirname, 'assets', 'icon.ico'), icoBuffer);
    console.log('✅ Generated icon.ico');
    
    // For macOS, we can use the PNG directly (already exists)
    console.log('✅ Using existing icon.png for macOS');
    
    console.log('Icon generation complete!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
