module.exports = {
  apps: [
    {
      name: 'platform',
      cwd: '/var/www/talosprimes/packages/platform',
      script: 'npm',
      args: 'start',
      env_file: '/var/www/talosprimes/packages/platform/.env',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/www/talosprimes/logs/platform-error.log',
      out_file: '/var/www/talosprimes/logs/platform-out.log',
      time: true,
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
    },
    {
      name: 'client',
      cwd: '/var/www/talosprimes/packages/client',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/www/talosprimes/logs/client-error.log',
      out_file: '/var/www/talosprimes/logs/client-out.log',
      time: true,
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
    }
  ]
};
