import type { Action, ActionId } from "./actions";
import { word } from "./changes";
import type { Category, Lang, Localized } from "./types";

interface Entry {
  title: Localized;
  body: Localized;
}

/** Plain-language advice for each action, in English and Hindi, with {placeholders} filled from the plan. */
const CATALOG: Record<ActionId, (a: Action) => Entry> = {
  purifier: () => ({
    title: {
      en: "Run a good HEPA purifier in the room you use most",
      hi: "सबसे ज़्यादा इस्तेमाल होने वाले कमरे में अच्छा HEPA प्यूरीफायर चलाएँ",
    },
    body: {
      en: "Shut windows leak: indoor air still carries a large share of the smog outside. A purifier sized for the room keeps running while you sleep and cook, which is when most of a home-bound day is spent.",
      hi: "बंद खिड़कियों से भी बाहर की हवा का बड़ा हिस्सा अंदर आता है। कमरे के हिसाब से सही प्यूरीफायर सोते और खाना बनाते समय भी चलता रहे, तो घर में बिताए दिन का ज़्यादातर समय साफ़ हवा में गुज़रता है।",
    },
  }),
  windows: (a) =>
    a.params.when === "closed"
      ? {
          title: { en: "Keep windows shut all day", hi: "आज खिड़कियाँ दिन भर बंद रखें" },
          body: {
            en: "Outside air is dirtier than your indoor air in every hour today, so even short airing lets smog in. Seal gaps with weatherstrip or a damp towel.",
            hi: "आज हर घंटे बाहर की हवा आपके घर की हवा से ज़्यादा गंदी है, इसलिए थोड़ी देर खिड़की खोलना भी नुकसान करेगा। दरारें स्ट्रिप या गीले तौलिये से बंद करें।",
          },
        }
      : {
          title: {
            en: `Air the house once, around ${a.params.when}:00`,
            hi: `घर को एक बार ही हवादार करें, लगभग ${a.params.when}:00 बजे`,
          },
          body: {
            en: "That is the cleanest hour of the day. Open for 10 to 15 minutes, then shut up again.",
            hi: "आज का सबसे साफ़ घंटा यही है। 10 से 15 मिनट खिड़की खोलें, फिर बंद कर दें।",
          },
        },
  mask: (a) => ({
    title: {
      en: "Wear a well-fitted N95 or FFP2 on the commute",
      hi: "आते-जाते समय ठीक से फिट होने वाला N95 या FFP2 मास्क लगाएँ",
    },
    body: {
      en:
        (a.params.open
          ? "Your trip is in open air, so you breathe the full roadside level. "
          : "Even a closed vehicle or station draws in the roadside air. ") +
        "A fitted N95 filters most fine particles; cloth and loose surgical masks do far less, and no mask stops ozone.",
      hi:
        (a.params.open
          ? "आपका सफ़र खुली हवा में है, इसलिए सड़क की पूरी गंदी हवा साँस में जाती है। "
          : "बंद गाड़ी या स्टेशन में भी सड़क की हवा अंदर आती है। ") +
        "सही फिट वाला N95 ज़्यादातर बारीक कण रोकता है; कपड़े या ढीले सर्जिकल मास्क बहुत कम रोकते हैं, और कोई मास्क ओज़ोन नहीं रोकता।",
    },
  }),
  exercise: (a) =>
    a.params.when === "indoors"
      ? {
          title: { en: "Exercise indoors today", hi: "आज कसरत घर के अंदर करें" },
          body: {
            en: "Hard breathing multiplies how much smog reaches your lungs. Yoga, stairs or a skipping rope indoors beat a polluted morning walk.",
            hi: "तेज़ साँस लेने पर कई गुना ज़्यादा प्रदूषण फेफड़ों में जाता है। घर में योग, सीढ़ियाँ या रस्सी कूदना, प्रदूषित सुबह की सैर से बेहतर है।",
          },
        }
      : {
          title: {
            en: `Move your outdoor workout to ${a.params.when}:00`,
            hi: `बाहर की कसरत ${a.params.when}:00 बजे करें`,
          },
          body: {
            en: "Early morning is usually the dirtiest time in Delhi winters. The afternoon trough is the cleanest window you will get today.",
            hi: "दिल्ली की सर्दियों में सुबह-सुबह हवा सबसे ख़राब होती है। दोपहर का समय आज का सबसे साफ़ मौक़ा है।",
          },
        },
  hood: () => ({
    title: {
      en: "Use the hood or exhaust fan every time you cook",
      hi: "खाना बनाते समय हर बार चिमनी या एग्ज़ॉस्ट फ़ैन चलाएँ",
    },
    body: {
      en: "Cooking on any stove releases fine particles. Run the fan through cooking and for ten minutes after, and keep the kitchen door closed.",
      hi: "किसी भी चूल्हे पर खाना पकाने से बारीक कण निकलते हैं। पकाते समय और बाद में दस मिनट तक पंखा चलाएँ और रसोई का दरवाज़ा बंद रखें।",
    },
  }),
  cooking_fuel: (a) => ({
    title:
      a.params.to === "lpg"
        ? { en: "Switch from wood or dung fuel to LPG", hi: "लकड़ी या उपलों की जगह एलपीजी अपनाएँ" }
        : {
            en: "Consider an induction hob for daily cooking",
            hi: "रोज़ के खाने के लिए इंडक्शन हॉब पर विचार करें",
          },
    body: {
      en:
        a.params.to === "lpg"
          ? "Burning biomass indoors is one of the largest sources of fine particles inside a home. A subsidised LPG connection removes most of it."
          : "An induction hob produces almost no particles. Even using it for tea and breakfast on the worst days helps.",
      hi:
        a.params.to === "lpg"
          ? "घर के अंदर लकड़ी या उपले जलाना बारीक कणों का सबसे बड़ा स्रोत है। सब्सिडी वाला एलपीजी कनेक्शन इसे लगभग ख़त्म कर देता है।"
          : "इंडक्शन से लगभग कोई कण नहीं निकलते। सबसे ख़राब दिनों में चाय-नाश्ता इसी पर बनाना भी मदद करता है।",
    },
  }),
  commute_switch: (a) => ({
    title: {
      en: `Travel by ${word(String(a.params.to), "en")} instead of ${word(String(a.params.from), "en")}`,
      hi: `${word(String(a.params.from), "hi")} की जगह ${word(String(a.params.to), "hi")} से जाएँ`,
    },
    body: {
      en: "A shared, low-emission trip cuts the carbon you add each month and takes one more tailpipe off your street. It was chosen because it does not raise how much smog you breathe on a day like this.",
      hi: "साझा, कम-उत्सर्जन वाला सफ़र हर महीने आपके हिस्से का कार्बन घटाता है और आपकी सड़क से एक धुआँ-उगलता वाहन कम करता है। इसे इसलिए चुना गया कि ऐसे दिन इससे आपकी साँस में जाने वाला प्रदूषण नहीं बढ़ता।",
    },
  }),
  protect_sensitive: (a) => ({
    title: {
      en: `Keep children, elders and anyone with breathing or heart conditions indoors around ${a.params.peak}:00`,
      hi: `बच्चों, बुज़ुर्गों और साँस या दिल की बीमारी वाले लोगों को ${a.params.peak}:00 बजे के आसपास घर में रखें`,
    },
    body: {
      en: "These are today's dirtiest hours. Keep prescribed medicines within reach. For breathlessness, chest tightness or a cough that will not settle, see a doctor.",
      hi: "ये आज के सबसे प्रदूषित घंटे हैं। डॉक्टर की बताई दवाएँ पास रखें। साँस फूलने, सीने में जकड़न या न रुकने वाली खाँसी पर डॉक्टर को दिखाएँ।",
    },
  }),
  school_run: () => ({
    title: { en: "Lighten the school run", hi: "स्कूल आना-जाना हल्का करें" },
    body: {
      en: "Carpool or use the school bus, avoid idling engines at the gate where exhaust collects, and have children wear a fitted mask for any walk on poor days.",
      hi: "कारपूल या स्कूल बस लें, गेट पर इंजन चालू न छोड़ें क्योंकि वहाँ धुआँ जमा होता है, और ख़राब दिनों में पैदल चलते समय बच्चों को सही फिट वाला मास्क पहनाएँ।",
    },
  }),
  clean_air_room: (a) => ({
    title: {
      en: "Set up a shared clean-air room",
      hi: "सोसाइटी में साझा स्वच्छ-हवा कक्ष बनाएँ",
    },
    body: {
      en: `Put a good purifier in a large clubhouse room, open on bad days for elders, infants and anyone with asthma. One room can serve many of your ${a.params.n} households.`,
      hi: `क्लबहाउस के बड़े कमरे में अच्छा प्यूरीफायर लगाएँ, जो ख़राब दिनों में बुज़ुर्गों, शिशुओं और दमा के मरीज़ों के लिए खुला रहे। एक कमरा आपके ${a.params.n} परिवारों में से कई की मदद कर सकता है।`,
    },
  }),
  carpool: (a) => ({
    title: { en: "Start a carpool roster", hi: "कारपूल की सूची शुरू करें" },
    body: {
      en: `If ${a.params.joined} of your ${a.params.n} households share rides in threes, that is about ${a.co2Kg} kg less CO2 every month and fewer cars at the gate.`,
      hi: `अगर आपके ${a.params.n} परिवारों में से ${a.params.joined} तीन-तीन के समूह में साथ चलें, तो हर महीने लगभग ${a.co2Kg} किग्रा कम CO2 होगा और गेट पर कम गाड़ियाँ होंगी।`,
    },
  }),
  no_burning: () => ({
    title: { en: "Agree a no-burning pledge", hi: "कुछ भी न जलाने का संकल्प लें" },
    body: {
      en: "Give guards and staff heaters or blankets instead of bonfires of leaves, wood or waste. Biomass burning is roughly a fifth of winter PM2.5 in the region.",
      hi: "गार्ड और स्टाफ़ को पत्तों, लकड़ी या कचरे के अलाव की जगह हीटर या कंबल दें। इस क्षेत्र में सर्दियों के PM2.5 का लगभग पाँचवाँ हिस्सा बायोमास जलाने से आता है।",
    },
  }),
};

export function describeAction(action: Action, lang: Lang): { title: string; body: string } {
  const entry = CATALOG[action.id](action);
  return { title: entry.title[lang], body: entry.body[lang] };
}

/** The measurable benefits of an action, as short phrases for impact chips. */
export function impactChips(action: Action, lang: Lang): string[] {
  const chips: string[] = [];
  if (action.impactPct !== null && action.impactPct > 0) {
    chips.push(
      lang === "hi"
        ? `दिन भर में लगभग ${action.impactPct}% कम PM2.5 साँस में`
        : `about ${action.impactPct}% less PM2.5 breathed in a day`,
    );
  }
  if (action.co2Kg !== null && action.co2Kg > 0) {
    chips.push(
      lang === "hi"
        ? `हर महीने ${action.co2Kg} किग्रा कम CO2`
        : `${action.co2Kg} kg less CO2 a month`,
    );
  }
  return chips;
}

export const CATEGORY_LABEL: Record<Category, Localized> = {
  good: { en: "Good", hi: "अच्छी" },
  satisfactory: { en: "Satisfactory", hi: "संतोषजनक" },
  moderate: { en: "Moderate", hi: "मध्यम" },
  poor: { en: "Poor", hi: "ख़राब" },
  very_poor: { en: "Very poor", hi: "बहुत ख़राब" },
  severe: { en: "Severe", hi: "गंभीर" },
};

export const GRAP_LABEL: Record<number, Localized> = {
  0: { en: "No GRAP stage at this level", hi: "इस स्तर पर कोई GRAP चरण नहीं" },
  1: { en: "GRAP Stage I range", hi: "GRAP चरण I का दायरा" },
  2: { en: "GRAP Stage II range", hi: "GRAP चरण II का दायरा" },
  3: { en: "GRAP Stage III range", hi: "GRAP चरण III का दायरा" },
  4: { en: "GRAP Stage IV range", hi: "GRAP चरण IV का दायरा" },
};
