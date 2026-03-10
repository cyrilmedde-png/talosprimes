-- Stock Management Module Workflow Links
-- Module Code: gestion_stock
-- Total Workflows: 16

INSERT INTO workflow_links (id, module_metier, workflow_path, workflow_name, description, created_at, updated_at) VALUES
(gen_random_uuid(), 'gestion_stock', 'stock-sites-list', 'stock-sites-list', 'List all stock sites (warehouses/locations) for a tenant', NOW(), NOW()),
(gen_random_uuid(), 'gestion_stock', 'stock-site-created', 'stock-site-created', 'Create a new stock site', NOW(), NOW()),
(gen_random_uuid(), 'gestion_stock', 'stock-site-updated', 'stock-site-updated', 'Update a stock site', NOW(), NOW()),
(gen_random_uuid(), 'gestion_stock', 'stock-site-deleted', 'stock-site-deleted', 'Delete a stock site', NOW(), NOW()),
(gen_random_uuid(), 'gestion_stock', 'stock-levels-list', 'stock-levels-list', 'List stock levels with article and site details', NOW(), NOW()),
(gen_random_uuid(), 'gestion_stock', 'stock-movements-list', 'stock-movements-list', 'List stock movements (entries/exits) sorted by date', NOW(), NOW()),
(gen_random_uuid(), 'gestion_stock', 'stock-movement-created', 'stock-movement-created', 'Create stock movement and update stock levels in transaction', NOW(), NOW()),
(gen_random_uuid(), 'gestion_stock', 'stock-transfers-list', 'stock-transfers-list', 'List stock transfers between sites', NOW(), NOW()),
(gen_random_uuid(), 'gestion_stock', 'stock-transfer-created', 'stock-transfer-created', 'Create new stock transfer with line items', NOW(), NOW()),
(gen_random_uuid(), 'gestion_stock', 'stock-transfer-confirmed', 'stock-transfer-confirmed', 'Confirm transfer and deduct from source site', NOW(), NOW()),
(gen_random_uuid(), 'gestion_stock', 'stock-transfer-received', 'stock-transfer-received', 'Receive transfer and add to destination site', NOW(), NOW()),
(gen_random_uuid(), 'gestion_stock', 'stock-inventories-list', 'stock-inventories-list', 'List physical inventories for sites', NOW(), NOW()),
(gen_random_uuid(), 'gestion_stock', 'stock-inventory-created', 'stock-inventory-created', 'Create inventory and auto-populate with current stock levels', NOW(), NOW()),
(gen_random_uuid(), 'gestion_stock', 'stock-inventory-finalized', 'stock-inventory-finalized', 'Finalize inventory and adjust stock from discrepancies', NOW(), NOW()),
(gen_random_uuid(), 'gestion_stock', 'stock-alerts-list', 'stock-alerts-list', 'List stock alerts (low stock warnings)', NOW(), NOW()),
(gen_random_uuid(), 'gestion_stock', 'stock-dashboard-metrics', 'stock-dashboard-metrics', 'Get aggregated dashboard metrics for stock management', NOW(), NOW());
