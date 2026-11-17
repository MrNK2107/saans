import {
  careActions,
  commuteAction,
  communityActions,
  exerciseAction,
  fuelAction,
  hoodAction,
  maskAction,
  purifierAction,
  windowsAction,
  type Action,
  type Context,
} from "./actions";
import { aqiOf, categoryOf, categoryOfPm25 } from "./aqi";
import {
  baselineBehaviour,
  exposure,
  reduction,
  type Behaviour,
  type Exposure,
  type PersonaId,
} from "./exposure";
import { grapStage, type GrapStage } from "./grap";
import { findLocality } from "./localities";
import type { Category, Day, Profile } from "./types";

export interface HourlyPoint {
  hour: number;
  pm25: number;
  aqi: number;
  category: Category;
}

export interface Outcome {
  persona: PersonaId;
  before: Exposure;
  after: Exposure;
  /** Percentage fewer PM2.5 particles inhaled over the day when every recommended action is followed. */
  reductionPct: number;
  beforeCategory: Category;
  afterCategory: Category;
}

export interface Plan {
  date: string;
  source: Day["source"];
  locality: string;
  hourly: HourlyPoint[];
  meanPm25: number;
  meanAqi: number;
  peakAqi: number;
  category: Category;
  grap: GrapStage;
  sensitive: boolean;
  /** Start of the cleanest daytime hour, and the three dirtiest hours of the day. */
  cleanestHour: number;
  worstHours: number[];
  outcomes: Outcome[];
  actions: Action[];
}

const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

function contextOf(profile: Profile, day: Day): Context {
  const { members, conditions, commute } = profile;
  const vulnerable =
    members.infants + members.seniors + members.children > 0 || conditions.length > 0;
  const commutes = commute.mode !== "wfh" && commute.daysPerWeek > 0 && members.adults > 0;
  const personas: PersonaId[] = [];
  if (commutes) personas.push("commuter");
  if (vulnerable || !commutes) personas.push("homebody");
  const home: PersonaId = personas.includes("homebody") ? "homebody" : "commuter";
  const mover: PersonaId = commutes ? "commuter" : "homebody";
  return {
    profile,
    day,
    personas,
    home,
    mover,
    meanAqi: aqiOf(mean(day.pm25), mean(day.pm10)),
    sensitive: vulnerable,
  };
}

/** Every recommended behaviour applied together, so the plan can state its combined effect. */
function recommended(profile: Profile, actions: Action[]): Behaviour {
  const b = baselineBehaviour(profile);
  for (const a of actions) {
    if (a.id === "purifier") b.purifier = "good";
    if (a.id === "windows")
      b.windows = a.params.when === "closed" ? "closed" : { openHour: Number(a.params.when) };
    if (a.id === "mask") b.mask = "n95";
    if (a.id === "exercise")
      b.exerciseHour = typeof a.params.when === "number" ? a.params.when : null;
    if (a.id === "hood") b.rangeHood = true;
    if (a.id === "cooking_fuel") b.cooking = a.params.to as Behaviour["cooking"];
  }
  return b;
}

function worstThree(pm25: readonly number[]): number[] {
  return pm25
    .map((v, h) => ({ v, h }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 3)
    .map((x) => x.h)
    .sort((a, b) => a - b);
}

export function buildPlan(profile: Profile, day: Day): Plan {
  const c = contextOf(profile, day);
  const hourly = day.pm25.map((pm25, hour) => {
    const aqi = aqiOf(pm25, day.pm10[hour] ?? 0);
    return { hour, pm25, aqi, category: categoryOf(aqi) };
  });
  const worst = worstThree(day.pm25);
  const peak = worst.join(", ");

  const measured = [
    windowsAction,
    purifierAction,
    maskAction,
    exerciseAction,
    hoodAction,
    fuelAction,
  ]
    .map((make) => make(c))
    .filter((a): a is Action => a !== null)
    .sort((a, b) => (b.impactPct ?? 0) - (a.impactPct ?? 0));
  const commute = commuteAction(c);
  const actions = [
    ...careActions(c, peak),
    ...measured,
    ...(commute ? [commute] : []),
    ...communityActions(c),
  ];

  const base = baselineBehaviour(profile);
  const plan = recommended(profile, measured);
  const outcomes = c.personas.map((persona): Outcome => {
    const before = exposure(day, profile, base, persona);
    const after = exposure(day, profile, plan, persona);
    return {
      persona,
      before,
      after,
      reductionPct: reduction(before.dose, after.dose),
      beforeCategory: categoryOfPm25(before.meanConc),
      afterCategory: categoryOfPm25(after.meanConc),
    };
  });

  const meanPm25 = Math.round(mean(day.pm25));
  return {
    date: day.date,
    source: day.source,
    locality: findLocality(profile.locality)?.name ?? profile.locality,
    hourly,
    meanPm25,
    meanAqi: c.meanAqi,
    peakAqi: Math.max(...hourly.map((h) => h.aqi)),
    category: categoryOf(c.meanAqi),
    grap: grapStage(c.meanAqi),
    sensitive: c.sensitive,
    cleanestHour: 9 + day.pm25.slice(9, 18).indexOf(Math.min(...day.pm25.slice(9, 18))),
    worstHours: worst,
    outcomes,
    actions,
  };
}
