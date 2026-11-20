/**
 * First-aid guides for common minor injuries and illnesses. Plain data, so wording can be reviewed and changed without touching any page code.
 * Written from widely used first-aid guidance. Set REVIEWED to true once a pharmacist or doctor has read them.
 */

export const REVIEWED = false;

export type FirstAidIcon = "flame" | "droplets" | "thermometer" | "sun" | "bug" | "activity" | "footprints" | "bandage" | "siren";

export type FirstAidGuide = {
  slug: string;
  title: string;
  icon: FirstAidIcon;
  summary: string;
  /** Signs that mean "call for help or go to hospital now". */
  emergency: string[];
  steps: string[];
  avoid: string[];
  /** Searches that open our medicine list. */
  products: { label: string; q: string }[];
};

export const FIRST_AID: FirstAidGuide[] = [
  {
    slug: "burns",
    title: "Burns and scalds",
    icon: "flame",
    summary: "Cool the burn, cover it loosely and know which burns need a hospital.",
    emergency: [
      "The burn is bigger than the palm of the person's hand, or is on the face, hands, feet, groin or over a joint",
      "The skin looks white, leathery or charred, or the burn is deep",
      "It was caused by chemicals, electricity or an explosion, or the person breathed in smoke",
      "The person is a baby, a young child or an older adult",
    ],
    steps: [
      "Move the person away from the heat source. Put out any flames on clothing.",
      "Cool the burn at once under cool (not ice-cold) running water for 20 minutes.",
      "Gently take off rings, watches or tight clothing near the burn before it swells. Do not pull off anything stuck to the skin.",
      "Cover the burn loosely with cling film or a clean, non-fluffy cloth to keep it clean.",
      "For pain, paracetamol can be taken as the label or your doctor advises.",
    ],
    avoid: ["Ice, butter, oil, toothpaste, turmeric or other home remedies on the burn", "Bursting blisters", "Fluffy cotton wool or sticky dressings directly on the burn"],
    products: [
      { label: "Burn care", q: "burn" },
      { label: "Povidone", q: "povidone" },
      { label: "Gauze", q: "gauze" },
      { label: "Bandages", q: "bandage" },
    ],
  },
  {
    slug: "cuts",
    title: "Cuts and scrapes",
    icon: "bandage",
    summary: "Stop the bleeding, clean the wound and cover it to prevent infection.",
    emergency: [
      "Bleeding does not slow after 10 minutes of firm pressure, or blood is spurting",
      "The cut is deep, gaping, on the face, or has something stuck in it",
      "It was caused by an animal or human bite, or a rusty or very dirty object",
      "Later: spreading redness, swelling, pus, increasing pain or a fever",
    ],
    steps: [
      "Wash your hands. Press firmly on the wound with a clean cloth or gauze and raise the injured part if you can. Keep pressing for 10 minutes without lifting to look.",
      "When bleeding stops, rinse the wound well under clean running water. Clean the skin around it with mild soap.",
      "Apply an antiseptic and cover with a clean dressing. Change it daily or when wet or dirty.",
      "Ask a doctor about a tetanus injection if you are not sure your vaccination is up to date, especially for dirty or deep wounds.",
    ],
    avoid: ["Putting cotton wool directly on the wound", "Pulling out a deeply stuck object (press around it and get help)", "Powders, turmeric or home pastes on an open wound"],
    products: [
      { label: "Antiseptic", q: "antiseptic" },
      { label: "Povidone", q: "povidone" },
      { label: "Bandages", q: "bandage" },
      { label: "Gauze", q: "gauze" },
    ],
  },
  {
    slug: "nosebleed",
    title: "Nosebleed",
    icon: "droplets",
    summary: "Sit forward, pinch the soft part of the nose and wait.",
    emergency: [
      "The bleeding lasts more than 20 minutes despite pressure",
      "It follows a head injury or a heavy blow to the face",
      "The bleeding is heavy, or the person feels faint, or takes blood thinners",
    ],
    steps: [
      "Sit upright and lean slightly forward so blood does not run down the throat.",
      "Pinch the soft part of the nose, just below the bony bridge, firmly for 10 to 15 minutes. Breathe through the mouth. Do not let go to check.",
      "A cold cloth on the nose bridge may help.",
      "After it stops, avoid blowing or picking the nose and avoid hot drinks and hard exercise for the rest of the day.",
    ],
    avoid: ["Tilting the head back", "Lying flat", "Packing the nose with tissue or cotton"],
    products: [{ label: "Saline", q: "saline" }],
  },
  {
    slug: "sprain",
    title: "Sprains and strains",
    icon: "footprints",
    summary: "Rest, cold, compression and elevation for the first two days.",
    emergency: [
      "The person cannot put any weight on the injured part, or the limb looks bent or out of shape",
      "There is severe swelling, numbness, tingling or a cold, pale or blue foot or hand",
      "You heard a snap or the pain is severe",
      "Little improvement after two to three days",
    ],
    steps: [
      "Rest: stop using the injured part.",
      "Cold: hold a cloth-wrapped ice pack on it for 15 to 20 minutes, every two to three hours for the first two days.",
      "Compression: wrap with an elastic bandage. It should be snug but not tight. Loosen it if the toes or fingers tingle or turn blue.",
      "Elevation: raise the injured part above heart level when resting.",
      "Paracetamol can ease pain. Ask your doctor or pharmacist before using other painkillers.",
    ],
    avoid: ["Heat, hot packs or massage in the first 48 hours", "Alcohol", "Putting ice directly on bare skin"],
    products: [
      { label: "Crepe bandage", q: "crepe bandage" },
      { label: "Pain spray", q: "pain spray" },
      { label: "Ice pack", q: "ice pack" },
    ],
  },
  {
    slug: "fever",
    title: "Fever",
    icon: "thermometer",
    summary: "How to look after someone with a fever and the signs that need a doctor.",
    emergency: [
      "A baby under three months old with a temperature of 38 degrees C (100.4 degrees F) or higher",
      "A temperature of 39.4 degrees C (103 degrees F) or higher, or any fever lasting more than two to three days",
      "Fever with a stiff neck, severe headache, confusion, a rash that does not fade, a fit or trouble breathing",
      "Fever with severe body pain, bleeding or persistent vomiting, especially during the monsoon (dengue and malaria are common)",
      "A fever in a pregnant woman, or someone with a long-term illness",
    ],
    steps: [
      "Measure the temperature with a thermometer. A reading above 38 degrees C (100.4 degrees F) is a fever.",
      "Rest, wear light clothes and drink plenty of fluids. ORS helps if there is sweating, vomiting or loose motions.",
      "A lukewarm sponge can be comforting. Keep the room comfortable, not cold.",
      "Paracetamol can bring the temperature down. Follow the label or your doctor's advice for the right amount, especially for children.",
    ],
    avoid: ["Giving aspirin to children", "Ice-cold baths or alcohol rubs", "Taking antibiotics without a doctor's advice", "Other painkillers with a suspected dengue fever unless your doctor says so"],
    products: [
      { label: "Thermometer", q: "thermometer" },
      { label: "Paracetamol", q: "paracetamol" },
      { label: "ORS", q: "ORS" },
    ],
  },
  {
    slug: "heat-stroke",
    title: "Heat exhaustion and heat stroke",
    icon: "sun",
    summary: "Cool the person fast. Heat stroke is an emergency.",
    emergency: [
      "Confusion, slurred speech, fainting or a fit",
      "Very hot skin, a body temperature of 40 degrees C (104 degrees F) or more, or no sweating despite the heat",
      "Heat exhaustion that is not improving within 30 minutes of cooling down",
    ],
    steps: [
      "Call 112 right away if you suspect heat stroke.",
      "Move the person to shade or a cool room and lay them down. Loosen or remove extra clothing.",
      "Cool the body with wet cloths, a fan, or by sponging with cool water. Cold packs wrapped in cloth at the neck, armpits and groin help.",
      "If the person is awake and can swallow, give small sips of cool water or ORS.",
      "For milder heat exhaustion (heavy sweating, weakness, headache, nausea), rest in a cool place and sip ORS or water until recovered.",
    ],
    avoid: ["Giving anything to drink to someone who is drowsy or unconscious", "Leaving the person alone", "Fever-reducing tablets (they do not help heat stroke)"],
    products: [
      { label: "ORS", q: "ORS" },
      { label: "Electrolyte", q: "electrolyte" },
      { label: "Glucose", q: "glucose" },
    ],
  },
  {
    slug: "insect-sting",
    title: "Insect stings and bites",
    icon: "bug",
    summary: "Remove the sting, cool the area and watch for an allergic reaction.",
    emergency: [
      "Swelling of the face, lips, tongue or throat, or trouble breathing or swallowing",
      "Dizziness, a fast pulse, widespread hives or feeling faint after a sting",
      "Many stings at once, or a sting inside the mouth or throat",
      "A fever or a spreading, painful redness in the days after a bite",
    ],
    steps: [
      "Move away from the insects. If a stinger is visible (bees), scrape it off sideways with a card or fingernail. Do not squeeze it.",
      "Wash the area with soap and water.",
      "Apply a cold pack or cold wet cloth for 10 to 15 minutes to reduce swelling and pain.",
      "Calamine lotion or a mild hydrocortisone cream can ease itching. An antihistamine tablet can help, as the label or your doctor advises.",
      "Fever within days of mosquito bites during the monsoon should be checked by a doctor.",
    ],
    avoid: ["Scratching, which can cause infection", "Squeezing the sting", "Home pastes on broken skin"],
    products: [
      { label: "Calamine", q: "calamine" },
      { label: "Hydrocortisone", q: "hydrocortisone" },
      { label: "Cetirizine", q: "cetirizine" },
      { label: "Mosquito protection", q: "mosquito" },
    ],
  },
  {
    slug: "diarrhoea",
    title: "Diarrhoea and dehydration",
    icon: "activity",
    summary: "Replace lost fluids with ORS and know when to see a doctor.",
    emergency: [
      "Blood in the stool, black stools, or a high fever",
      "Signs of dehydration: very dry mouth, little or no urine for eight hours, sunken eyes, extreme thirst or drowsiness",
      "Infants, young children or older adults with diarrhoea or vomiting",
      "Severe stomach pain, repeated vomiting, or diarrhoea lasting more than two days",
    ],
    steps: [
      "Give ORS after each loose stool. Use a packaged ORS and mix it exactly as the pack says, with clean boiled and cooled water. Do not add extra sugar or salt.",
      "Keep eating light foods such as rice, banana, curd and dal. Continue breastfeeding babies.",
      "Wash your hands well with soap, especially before eating and after using the toilet.",
      "Zinc is often advised for children with diarrhoea. Ask a doctor for the right course.",
    ],
    avoid: ["Taking antibiotics or anti-diarrhoea tablets without a doctor's advice", "Fizzy drinks, packaged juices or plain water alone for replacing salts", "Street food and unboiled water until recovered"],
    products: [
      { label: "ORS", q: "ORS" },
      { label: "Zinc", q: "zinc" },
      { label: "Electrolyte", q: "electrolyte" },
    ],
  },
  {
    slug: "snake-bite",
    title: "Snake bite",
    icon: "siren",
    summary: "Stay calm, keep still and get to a hospital with anti-venom at once.",
    emergency: [
      "Any bite from a snake you cannot be sure is harmless is a medical emergency. Call 112 or 108 and go to a hospital at once.",
    ],
    steps: [
      "Call 112 (or 108 for an ambulance) and get to a hospital that has anti-venom. Do not wait for symptoms.",
      "Keep the person calm and still. Movement spreads venom faster.",
      "Keep the bitten limb still, at or just below heart level, and loosely support it as you would for a broken bone.",
      "Remove rings, watches and tight clothing from the area before it swells.",
      "Note the time of the bite. If it is safe, take a photo of the snake from a distance. Do not try to catch it.",
    ],
    avoid: ["Cutting the wound or sucking out the venom", "Tying a tight band or tourniquet", "Ice, herbs, oil, alcohol or going to a traditional healer first", "Letting the person walk or run"],
    products: [],
  },
];

export const firstAidBySlug = (slug: string) => FIRST_AID.find((g) => g.slug === slug);

/** The general "call for help now" signs shown on the hub. */
export const EMERGENCY_SIGNS = [
  "Chest pain or pressure, or severe trouble breathing",
  "Face drooping, arm weakness or slurred speech (signs of a stroke)",
  "Heavy bleeding that will not stop, or someone who is unconscious or not responding",
  "A severe allergic reaction: swelling of the face or throat, wheezing",
  "Suspected poisoning, overdose or a serious burn",
];
