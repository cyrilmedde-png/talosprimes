module.exports = {
  apps: [{
    name: 'mcp-server',
    script: 'server.js',
    cwd: '/var/www/talosprimes/packages/mcp-server',
    env: {
      MCP_PORT: 3100,
      MCP_TOKEN: 'talosprimes-mcp-secret-2026',
      DATABASE_URL: process.env.DATABASE_URL || '',
      N8N_API_URL: process.env.N8N_API_URL || 'http://localhost:5678',
      N8N_API_KEY: process.env.N8N_API_KEY || '',
      PROJECT_DIR: '/var/www/talosprimes',
    },
  }],
};
