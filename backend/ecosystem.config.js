module.exports = {
  apps: [
    {
      name: 'ttx-backend',
      script: 'server.js',
      instances: 'max',       // uses all available CPU cores
      exec_mode: 'cluster',
      watch: false,
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
