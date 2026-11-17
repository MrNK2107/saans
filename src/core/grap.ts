/**
 * Delhi-NCR's Graded Response Action Plan stage for an AQI. The real trigger is CAQM's forecast for
 * the city; these thresholds follow its published AQI bands (I: 201-300, II: 301-400, III: 401-450,
 * IV: above 450), so this is an explanation aid, not an official declaration.
 */
export type GrapStage = 0 | 1 | 2 | 3 | 4;

export function grapStage(aqi: number): GrapStage {
  if (aqi > 450) return 4;
  if (aqi > 400) return 3;
  if (aqi > 300) return 2;
  if (aqi > 200) return 1;
  return 0;
}
