/**
 * Electron Builder Configuration for Portable Distribution
 * Creates a portable Windows executable that requires no installation
 */

module.exports = {
    appId: 'com.blackbox.racing',
    productName: 'BlackBox Racing',

    // Output directory
    directories: {
        output: 'dist',
        buildResources: 'resources'
    },

    // Files to include
    files: [
        'dist/**/*',
        'resources/**/*',
        'package.json'
    ],

    // Windows configuration
    win: {
        target: [
            {
                target: 'portable',  // Portable executable - no installation
                arch: ['x64']
            },
            {
                target: 'zip',       // Also create a zip for manual extraction
                arch: ['x64']
            }
        ],
        icon: 'resources/icon.ico',
        artifactName: 'BlackBox-Racing-${version}-Portable.${ext}'
    },

    // Portable-specific settings
    portable: {
        artifactName: 'BlackBox-Racing-Portable.exe'
    },

    // macOS configuration (optional - for future)
    mac: {
        target: ['dmg', 'zip'],
        category: 'public.app-category.sports',
        icon: 'resources/icon.icns'
    },

    // Linux configuration (optional - for future)
    linux: {
        target: ['AppImage'],
        category: 'Game',
        icon: 'resources/icons'
    },

    // Compression
    compression: 'maximum',

    // Don't publish automatically
    publish: null
};
