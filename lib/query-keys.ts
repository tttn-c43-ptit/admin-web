export const queryKeys = {
  // Gardens
  gardens: () => ['gardens'],
  gardenDetail: (id: string) => ['gardens', id],
  
  // Zones
  zones: (gardenId: string) => ['gardens', gardenId, 'zones'],
  
  // Staff & Assignments
  staff: () => ['staff'],
  zoneAssignments: (zoneId: string) => ['zones', zoneId, 'assignments'],
  
  // Plants & Tags (For future milestones)
  plants: (gardenId: string) => ['gardens', gardenId, 'plants'],
  plantDetail: (id: string) => ['plants', id],
  plantLogs: (id: string) => ['plants', id, 'logs'],
};
