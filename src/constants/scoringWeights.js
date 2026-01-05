export const scoringWeights = {
  thermal: {
    unit_cod: 0.20,
    capacity_factor: 0.00,
    markets: 0.30,
    transactability: 0.30,
    thermal_optimization: 0.05,
    environmental: 0.15
  },
  redevelopment: {
    market: 0.40,
    infra: 0.30,
    ix: 0.30
  }
};

export const sortableColumns = [
  { key: 'asset', label: 'Asset', type: 'string' },
  { key: 'owner', label: 'Owner', type: 'string' },
  { key: 'overall', label: 'Overall', type: 'number' },
  { key: 'thermal', label: 'Thermal', type: 'number' },
  { key: 'redev', label: 'Redev', type: 'number' },
  // CRITICAL: Add Transactability Score to sortable columns
  { key: 'transactabilityScore', label: 'Transact Score', type: 'number' },
  { key: 'mkt', label: 'Mkt', type: 'string' },
  { key: 'zone', label: 'Zone', type: 'string' },
  { key: 'mw', label: 'MW', type: 'number' },
  { key: 'tech', label: 'Tech', type: 'string' },
  { key: 'hr', label: 'HR', type: 'number' },
  { key: 'cf', label: 'CF', type: 'string' },
  { key: 'cod', label: 'COD', type: 'number' },
];