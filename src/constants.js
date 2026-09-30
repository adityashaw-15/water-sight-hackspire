export const navigation = ['Overview', 'Map', 'Alerts', 'History', 'Data Sources'];

export const alerts = [
  { id: 1, severity: 'High', title: 'Vegetation decline indicated', description: 'Prototype vegetation indicator below the reference period in Micro-watershed B.', location: 'Demo Watershed 01 · West Bengal', confidence: 'Prototype', time: 'Demo alert', region: 'Demo Watershed 01' },
  { id: 2, severity: 'Medium', title: 'Field verification requested', description: 'Recharge structure record has not received recent geo-coded field evidence.', location: 'Demo Watershed 01 · West Bengal', confidence: 'Prototype', time: 'Demo alert', region: 'Demo Watershed 01' },
  { id: 3, severity: 'Low', title: 'Water area variation observed', description: 'Demo water-body extent differs from the selected historical reference.', location: 'Demo Watershed 02 · District Data 2, West Bengal', confidence: 'Prototype', time: 'Demo alert', region: 'Demo Watershed 02' },
];

export const regions = [
  { name: 'Demo Watershed 01', country: 'West Bengal', water: '12 water bodies', delta: '+3.2%', tone: 'blue', alerts: 2, trend: 'Monitoring', map: 'valley' },
  { name: 'Demo Watershed 02', country: 'District Data 2, West Bengal', water: '8 water bodies', delta: '-1.1%', tone: 'teal', alerts: 1, trend: 'Monitoring', map: 'delta' },
  { name: 'Dwarakeswar Sub-basin', country: 'West Bengal · Prototype context', water: '14 mapped sites', delta: '+1.8%', tone: 'red', alerts: 2, trend: 'Reviewing', map: 'floodplain' },
  { name: 'South Bihar Demo', country: 'Bihar · Prototype context', water: '10 water bodies', delta: '+2.6%', tone: 'cyan', alerts: 1, trend: 'Monitoring', map: 'amazon' },
];

export const sources = [
  ['SRISHTI / WDC-PMKSY', 'Watershed and project geospatial information', 'On access', 'India', 'Integration ready'],
  ['Bhuvan', 'Indian geospatial and satellite visualisation', 'On access', 'India', 'Integration ready'],
  ['Geo-coded Field Images', 'Ground-level evidence records', 'Demo set', 'Demo Watershed 01', 'Demo'],
  ['Demo Satellite Data', 'Prototype satellite-derived context layer', 'Demo snapshot', 'Demo Watershed 01', 'Demo'],
  ['GIS Derived Layers', 'Prototype watershed analysis layers', 'Prototype', 'Demo Watershed 01', 'Demo'],
];

export const chartValues = { 7: [34, 42, 39, 48, 57, 55, 69], 30: [31, 35, 33, 41, 45, 44, 51, 54, 52, 61, 59, 68], 90: [26, 29, 35, 33, 42, 39, 47, 45, 54, 51, 59, 65] };

export const geoDatasets = ['india_states', 'districts', 'watersheds', 'micro_watersheds', 'villages', 'rivers', 'drainage', 'water_bodies', 'wells', 'interventions', 'critical_zones', 'field_images'];

export const hierarchyData = {
  "India": {
    "West Bengal": {
      "District Data": [
        { id: "wb-01", name: "Demo Watershed 01" }
      ],
      "District Data 2": [
        { id: "wb-02", name: "Demo Watershed 02" }
      ]
    }
  }
};
