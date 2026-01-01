// Electron Forge configuration
module.exports = {
  packagerConfig: {
    asar: true,
    // Skip icon for Windows builds on macOS (avoids Wine requirement)
    icon: process.platform === 'win32' ? './assets/icon' : undefined,
    name: 'BlackBox Driver App',
    executableName: 'blackbox-driver',
    appBundleId: 'com.blackbox.driver',
    appCategoryType: 'public.app-category.games',
    osxSign: {},
    // Skip Windows metadata to avoid Wine requirement
    win32metadata: undefined,
    ignore: [
      // Ignore the native module during packaging
      /node-irsdk/,
      /\.git/,
      /\.vscode/
    ]
  },
  rebuildConfig: {},
  publishers: [],
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'blackbox-driver-app',
        authors: 'BlackBox Racing',
        description: 'BlackBox Driver App - Lightweight telemetry collector for sim racing',
        iconUrl: './assets/icon.png',
        setupIcon: './assets/icon.png'
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32']
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'BlackBox Racing',
          homepage: 'https://blackboxracing.com',
          icon: './assets/icon.png'
        }
      }
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          maintainer: 'BlackBox Racing',
          homepage: 'https://blackboxracing.com',
          icon: './assets/icon.png'
        }
      }
    }
  ]
};
