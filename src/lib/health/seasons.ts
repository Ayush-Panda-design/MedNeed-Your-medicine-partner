/** Seasonal health alerts for India. Plain data, so a pharmacist can edit the wording without touching any page code. */

export type SeasonKey = "summer" | "monsoon" | "autumn" | "winter";

export type Season = {
  key: SeasonKey;
  label: string;
  months: string;
  headline: string;
  risks: string[];
  tips: string[];
  see: string;
  /** Searches that open our medicine list; only terms that return results in the catalogue. */
  products: { label: string; q: string }[];
  /** Related guides inside the Health hub. */
  links: { label: string; href: string }[];
};

export const SEASONS: Season[] = [
  {
    key: "summer",
    label: "Summer",
    months: "March to May",
    headline: "Heat, dehydration and upset stomachs",
    risks: ["Dehydration", "Heat exhaustion and heat stroke", "Sunburn and prickly heat", "Food poisoning"],
    tips: [
      "Drink water often through the day, even when you do not feel thirsty. Add ORS if you are sweating a lot or have loose motions.",
      "Stay indoors or in shade between 12 noon and 4 pm. Wear light, loose cotton clothes and a hat or umbrella outside.",
      "Eat freshly cooked food. Keep cooked food in the fridge and avoid street food that has been standing in the heat.",
      "Never leave children or older people in a parked vehicle, even for a few minutes.",
      "Use a sunscreen on exposed skin and keep skin clean and dry to prevent prickly heat.",
    ],
    see: "Confusion, fainting, a very high temperature or no sweating in the heat is an emergency. Call 112.",
    products: [
      { label: "ORS", q: "ORS" },
      { label: "Electrolyte drinks", q: "electrolyte" },
      { label: "Glucose", q: "glucose" },
      { label: "Sunscreen", q: "sunscreen" },
      { label: "Prickly heat powder", q: "prickly heat" },
    ],
    links: [
      { label: "First aid: heat exhaustion and heat stroke", href: "/health/first-aid/heat-stroke" },
      { label: "First aid: diarrhoea and dehydration", href: "/health/first-aid/diarrhoea" },
      { label: "Topic: dehydration", href: "/health/topics/dehydration" },
    ],
  },
  {
    key: "monsoon",
    label: "Monsoon",
    months: "June to September",
    headline: "Mosquito-borne fevers, stomach infections and fungal skin",
    risks: ["Dengue and malaria", "Typhoid, hepatitis A and diarrhoea", "Fungal skin infections", "Colds and flu"],
    tips: [
      "Do not let water stand in coolers, pots, tyres or plates. Mosquitoes breed in it within days. Use nets or repellent and cover your arms and legs at dusk.",
      "Drink boiled or filtered water, wash hands before eating, and avoid cut fruit and street food during heavy rain.",
      "Change out of wet clothes quickly and dry skin well, especially between toes and in skin folds. Do not share towels.",
      "Wading through flood water can spread infections. Wash with soap afterwards and see a doctor if you get a fever.",
      "With a fever, ask a doctor before taking any painkiller other than paracetamol, and get tested if fever and body pain last more than two days.",
    ],
    see: "High fever with severe body pain, bleeding gums, black stools, repeated vomiting or breathlessness needs a doctor the same day.",
    products: [
      { label: "ORS", q: "ORS" },
      { label: "Paracetamol", q: "paracetamol" },
      { label: "Mosquito repellent", q: "mosquito" },
      { label: "Antifungal cream", q: "antifungal" },
      { label: "Hand sanitiser", q: "sanitizer" },
      { label: "Antiseptic", q: "antiseptic" },
      { label: "Vitamin C", q: "vitamin C" },
      { label: "Zinc", q: "zinc" },
    ],
    links: [
      { label: "Topic: dengue", href: "/health/topics/dengue" },
      { label: "Topic: malaria", href: "/health/topics/malaria" },
      { label: "Topic: fungal infections", href: "/health/topics/fungal-infections" },
      { label: "First aid: fever", href: "/health/first-aid/fever" },
    ],
  },
  {
    key: "autumn",
    label: "Post-monsoon and festivals",
    months: "October and November",
    headline: "Viral fevers, smoky air and festival burns",
    risks: ["Dengue and viral fevers", "Allergies and asthma from smoke and dust", "Burns from crackers and lamps", "Sugar spikes from sweets"],
    tips: [
      "Mosquitoes stay active after the rains, so keep using nets or repellent and checking for stagnant water.",
      "On days with smoky or polluted air, wear a snug mask outdoors, keep windows closed and keep your regular inhaler or allergy medicine with you.",
      "Keep lamps, candles and crackers away from clothes and children. Keep a first-aid kit with a burn dressing ready.",
      "If you have diabetes, enjoy sweets in small portions, keep to your medicine times and check your sugar more often.",
      "Wash your hands often with soap. Viral fevers and coughs spread quickly at gatherings.",
    ],
    see: "Wheezing that does not settle, chest pain or a burn bigger than the palm of your hand needs urgent medical care.",
    products: [
      { label: "Masks", q: "mask" },
      { label: "Cetirizine", q: "cetirizine" },
      { label: "Burn care", q: "burn" },
      { label: "Antiseptic", q: "antiseptic" },
      { label: "Vitamin C", q: "vitamin C" },
      { label: "Glucometer", q: "glucometer" },
    ],
    links: [
      { label: "First aid: burns and scalds", href: "/health/first-aid/burns" },
      { label: "Topic: asthma", href: "/health/topics/asthma" },
      { label: "Topic: allergy", href: "/health/topics/allergy" },
    ],
  },
  {
    key: "winter",
    label: "Winter",
    months: "December to February",
    headline: "Colds, flu, dry skin and stiff joints",
    risks: ["Colds, sore throat and flu", "Asthma flare-ups", "Joint pain and stiffness", "Dry, cracked skin", "Higher blood pressure"],
    tips: [
      "Keep warm, drink warm fluids and rest when you have a cold. Steam and warm salt-water gargles ease a sore throat.",
      "Cover your mouth when you cough, wash your hands often and stay home if you have a fever. Ask your doctor about the yearly flu vaccine, especially for older people and those with long-term illness.",
      "Cold weather can push blood pressure up. If you have high blood pressure, check it regularly and do not skip your medicines.",
      "Moisturise after bathing and avoid very hot water to prevent dry skin and cracked lips.",
      "Gentle indoor exercise keeps joints moving. Sun exposure in the morning helps vitamin D.",
    ],
    see: "Breathing trouble, fever above 39 degrees C (102 degrees F) or a cough lasting more than three weeks needs a doctor.",
    products: [
      { label: "Cough syrup", q: "cough syrup" },
      { label: "Throat lozenges", q: "lozenge" },
      { label: "Vitamin D", q: "vitamin D" },
      { label: "Moisturiser", q: "moisturiser" },
      { label: "Thermometer", q: "thermometer" },
      { label: "BP monitor", q: "BP monitor" },
    ],
    links: [
      { label: "Topic: flu", href: "/health/topics/flu" },
      { label: "Topic: common cold", href: "/health/topics/common-cold" },
      { label: "Topic: high blood pressure", href: "/health/topics/high-blood-pressure" },
    ],
  },
];

/** Which season it is in India right now (Indian time, by month). */
export function seasonFor(date: Date = new Date()): SeasonKey {
  const month = new Date(date.getTime() + 5.5 * 3600_000).getUTCMonth(); // 0 = January
  if (month >= 2 && month <= 4) return "summer";
  if (month >= 5 && month <= 8) return "monsoon";
  if (month >= 9 && month <= 10) return "autumn";
  return "winter";
}

export const seasonByKey = (key: string | undefined) => SEASONS.find((s) => s.key === key);
