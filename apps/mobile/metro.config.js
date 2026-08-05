const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.extraNodeModules = {
  '@regieart/ui':     path.resolve(workspaceRoot, 'packages/ui'),
  '@regieart/api':    path.resolve(workspaceRoot, 'packages/api'),
  '@regieart/types':  path.resolve(workspaceRoot, 'packages/types'),
  '@regieart/config': path.resolve(workspaceRoot, 'packages/config'),
};

// Force @regieart/ui to the native entry — bypasses exports field which points to web/Vite index
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@regieart/ui') {
    return {
      filePath: path.resolve(workspaceRoot, 'packages/ui/src/index.native.ts'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
