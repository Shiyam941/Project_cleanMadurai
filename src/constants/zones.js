const createWardLabels = (start, end) => Array.from({ length: end - start + 1 }, (_, index) => `Ward ${start + index}`)

export const ZONES = [
  {
    id: 'zone-1',
    name: 'Zone 1 — Arasaradi Zone',
    wards: createWardLabels(1, 25),
  },
  {
    id: 'zone-2',
    name: 'Zone 2 — Anna Nagar Zone',
    wards: createWardLabels(26, 50),
  },
  {
    id: 'zone-3',
    name: 'Zone 3 — Thirupparankundram Zone',
    wards: createWardLabels(51, 75),
  },
  {
    id: 'zone-4',
    name: 'Zone 4 — Vandiyur Zone',
    wards: createWardLabels(76, 100),
  },
]

export const findZoneById = (zoneId) => ZONES.find((zone) => zone.id === zoneId)

export const findZoneByWard = (wardLabel) =>
  ZONES.find((zone) => zone.wards.some((ward) => ward === wardLabel))
