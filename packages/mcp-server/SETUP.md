# MCP Server TalosPrimes - Setup

## 1. Sur le VPS

```bash
cd /var/www/talosprimes/packages/mcp-server
npm install
```

Ajouter les variables dans le fichier ecosystem.config.cjs ou dans .env :
- DATABASE_URL : ton URL Supabase PostgreSQL
- N8N_API_URL : https://n8n.talosprimes.com (ou http://localhost:5678)
- N8N_API_KEY : ta clé API n8n
- MCP_TOKEN : le token secret (à changer en production)

Lancer avec PM2 :
```bash
pm2 start ecosystem.config.cjs
pm2 save
```

Configurer nginx pour exposer le port 3100 :
Ajouter dans la config nginx de talosprimes.com :
```nginx
location /mcp/ {
    proxy_pass http://localhost:3100/mcp/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

Recharger nginx :
```bash
nginx -t && systemctl reload nginx
```

## 2. Sur Claude Desktop (Mac)

Paramètres → Développeur → Modifier la config

Le serveur est accessible via HTTPS sur :
https://talosprimes.com/mcp/

Token d'authentification : x-mcp-token dans les headers

## 3. Endpoints disponibles

- GET  /mcp/health          → Santé du serveur
- POST /mcp/db/query        → Requête SQL (SELECT/INSERT/UPDATE)
- POST /mcp/exec            → Commande shell (whitelist)
- GET  /mcp/pm2/logs        → Logs PM2
- GET  /mcp/pm2/status      → Status PM2
- GET  /mcp/n8n/workflows   → Liste workflows n8n
- GET  /mcp/n8n/executions  → Exécutions récentes n8n
- POST /mcp/file/read       → Lire un fichier du projet
- GET  /mcp/git/status      → Git status + derniers commits
- GET  /mcp/system/info     → Infos système (uptime, disk, memory)
