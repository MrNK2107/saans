export interface Locality {
  id: string;
  name: string;
  /** Approximate neighbourhood centre; good enough for an 11 km model grid. */
  lat: number;
  lon: number;
}

/** Delhi-NCR neighbourhoods people recognise, spread across the city's pollution geography. */
export const LOCALITIES: readonly Locality[] = [
  { id: "anand-vihar", name: "Anand Vihar", lat: 28.6469, lon: 77.316 },
  { id: "bawana", name: "Bawana", lat: 28.7971, lon: 77.0498 },
  { id: "dwarka", name: "Dwarka", lat: 28.571, lon: 77.071 },
  { id: "faridabad", name: "Faridabad", lat: 28.4089, lon: 77.3178 },
  { id: "ghaziabad", name: "Indirapuram, Ghaziabad", lat: 28.646, lon: 77.3715 },
  { id: "gurugram", name: "Gurugram Sector 51", lat: 28.426, lon: 77.056 },
  { id: "ito", name: "ITO", lat: 28.6289, lon: 77.241 },
  { id: "jahangirpuri", name: "Jahangirpuri", lat: 28.7285, lon: 77.17 },
  { id: "janakpuri", name: "Janakpuri", lat: 28.6219, lon: 77.0878 },
  { id: "karol-bagh", name: "Karol Bagh", lat: 28.6519, lon: 77.1907 },
  { id: "lajpat-nagar", name: "Lajpat Nagar", lat: 28.5677, lon: 77.2433 },
  { id: "mayur-vihar", name: "Mayur Vihar", lat: 28.6086, lon: 77.295 },
  { id: "noida", name: "Noida Sector 62", lat: 28.627, lon: 77.3649 },
  { id: "okhla", name: "Okhla", lat: 28.5308, lon: 77.271 },
  { id: "pitampura", name: "Pitampura", lat: 28.7036, lon: 77.1318 },
  { id: "punjabi-bagh", name: "Punjabi Bagh", lat: 28.6683, lon: 77.1167 },
  { id: "rk-puram", name: "R K Puram", lat: 28.5636, lon: 77.1869 },
  { id: "rohini", name: "Rohini", lat: 28.738, lon: 77.0822 },
  { id: "saket", name: "Saket", lat: 28.5245, lon: 77.2066 },
  { id: "vasant-kunj", name: "Vasant Kunj", lat: 28.52, lon: 77.1585 },
  { id: "wazirpur", name: "Wazirpur", lat: 28.699, lon: 77.165 },
];

export function findLocality(id: string): Locality | undefined {
  return LOCALITIES.find((l) => l.id === id);
}
