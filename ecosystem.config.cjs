const path = require('node:path');

module.exports = {
  apps: [
    {
      name: 'mos-lab-api',
      script: './dist/server.js',
      cwd: path.join(__dirname, 'apps', 'api'),
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || '4001',
        DEPLOY_COMMIT: process.env.DEPLOY_COMMIT || '',
        DEPLOYED_AT: process.env.DEPLOYED_AT || '',
      },
    },
  ],
};
