const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const config = {
    resolver: {
        unstable_enablePackageExports: false,
        resolverMainFields: ['react-native', 'browser', 'main'],
        extraNodeModules: {
            'axios': path.resolve(__dirname, 'node_modules/axios/dist/browser/axios.cjs'),
            'crypto': path.resolve(__dirname, 'node_modules/react-native-quick-crypto'),
            'stream': path.resolve(__dirname, 'node_modules/stream-browserify'),
            'buffer': path.resolve(__dirname, 'node_modules/buffer'),
            'path': path.resolve(__dirname, 'node_modules/path-browserify'),
            'url': path.resolve(__dirname, 'node_modules/url'),
            'util': path.resolve(__dirname, 'node_modules/util'),
            'process': path.resolve(__dirname, 'node_modules/process/browser'),
            'http': path.resolve(__dirname, 'node_modules/stream-http'),
            'https': path.resolve(__dirname, 'node_modules/https-browserify'),
            'os': path.resolve(__dirname, 'node_modules/os-browserify/browser'),
            'net': path.resolve(__dirname, 'node_modules/path-browserify'), // Placeholder
            'tls': path.resolve(__dirname, 'node_modules/path-browserify'), // Placeholder
        }
    },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
