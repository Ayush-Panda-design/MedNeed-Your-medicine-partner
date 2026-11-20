/** Health topics shown from MedlinePlus (U.S. National Library of Medicine). Only the title, group and search words live here; the text is fetched. */

export type TopicGroup = "Infections and seasonal illness" | "Everyday health" | "Long-term conditions" | "Skin, injury and first aid";

export type HealthTopic = {
  slug: string;
  title: string;
  blurb: string;
  group: TopicGroup;
  /** MedlinePlus page name, for example "highbloodpressure" for medlineplus.gov/highbloodpressure.html */
  source: string;
  /** Search words that reach that page through the MedlinePlus web service. */
  term: string;
  /** Search words for related products in our catalogue (empty when none make sense). */
  q?: string;
};

export const TOPIC_GROUPS: TopicGroup[] = ["Infections and seasonal illness", "Everyday health", "Long-term conditions", "Skin, injury and first aid"];

export const TOPICS: HealthTopic[] = [
  { slug: "dengue", title: "Dengue", blurb: "A mosquito-borne fever: signs, spread and when to seek care.", group: "Infections and seasonal illness", source: "dengue", term: "dengue", q: "paracetamol" },
  { slug: "malaria", title: "Malaria", blurb: "Causes, symptoms and how it is prevented and treated.", group: "Infections and seasonal illness", source: "malaria", term: "malaria", q: "mosquito" },
  { slug: "flu", title: "Flu", blurb: "Influenza symptoms, care at home and prevention.", group: "Infections and seasonal illness", source: "flu", term: "influenza", q: "cough syrup" },
  { slug: "common-cold", title: "Common cold", blurb: "What helps a cold and when it is more than a cold.", group: "Infections and seasonal illness", source: "commoncold", term: "common cold", q: "cough syrup" },
  { slug: "diarrhea", title: "Diarrhoea", blurb: "Causes, treatment and keeping hydrated.", group: "Infections and seasonal illness", source: "diarrhea", term: "diarrhea", q: "ORS" },
  { slug: "hepatitis-a", title: "Hepatitis A", blurb: "A liver infection from contaminated food or water.", group: "Infections and seasonal illness", source: "hepatitisa", term: "hepatitis a" },
  { slug: "jaundice", title: "Jaundice", blurb: "Yellowing of the skin and eyes, and what can cause it.", group: "Infections and seasonal illness", source: "jaundice", term: "jaundice" },
  { slug: "fungal-infections", title: "Fungal infections", blurb: "Ringworm, athlete's foot and other skin fungal infections.", group: "Infections and seasonal illness", source: "fungalinfections", term: "fungal infections", q: "antifungal" },

  { slug: "dehydration", title: "Dehydration", blurb: "Signs of too little water and how to treat it.", group: "Everyday health", source: "dehydration", term: "dehydration", q: "ORS" },
  { slug: "fever", title: "Fever", blurb: "When a fever is harmless and when to see a doctor.", group: "Everyday health", source: "fever", term: "fever", q: "thermometer" },
  { slug: "headache", title: "Headache", blurb: "Common types of headache and what triggers them.", group: "Everyday health", source: "headache", term: "headache" },
  { slug: "constipation", title: "Constipation", blurb: "Causes and simple changes that help.", group: "Everyday health", source: "constipation", term: "constipation" },
  { slug: "gerd", title: "Acid reflux (GERD)", blurb: "Heartburn and acid reflux: causes and care.", group: "Everyday health", source: "gerd", term: "gerd" },
  { slug: "vitamin-d", title: "Vitamin D", blurb: "Why it matters, sources and who may be low.", group: "Everyday health", source: "vitamind", term: "vitamin d", q: "vitamin D" },
  { slug: "anemia", title: "Anaemia", blurb: "Low red blood cells or iron: symptoms and causes.", group: "Everyday health", source: "anemia", term: "anemia" },
  { slug: "back-pain", title: "Back pain", blurb: "Why backs hurt and what can ease it.", group: "Everyday health", source: "backpain", term: "back pain" },

  { slug: "diabetes", title: "Diabetes", blurb: "Types, symptoms, monitoring and living well with diabetes.", group: "Long-term conditions", source: "diabetes", term: "diabetes", q: "glucometer" },
  { slug: "high-blood-pressure", title: "High blood pressure", blurb: "Why it matters and how it is managed.", group: "Long-term conditions", source: "highbloodpressure", term: "high blood pressure", q: "BP monitor" },
  { slug: "cholesterol", title: "Cholesterol", blurb: "Good and bad cholesterol and keeping it in range.", group: "Long-term conditions", source: "cholesterol", term: "cholesterol" },
  { slug: "asthma", title: "Asthma", blurb: "Triggers, symptoms and keeping asthma under control.", group: "Long-term conditions", source: "asthma", term: "asthma" },
  { slug: "thyroid-diseases", title: "Thyroid diseases", blurb: "An overactive or underactive thyroid explained.", group: "Long-term conditions", source: "thyroiddiseases", term: "thyroid diseases" },
  { slug: "heart-diseases", title: "Heart diseases", blurb: "Common heart conditions and ways to protect your heart.", group: "Long-term conditions", source: "heartdiseases", term: "heart diseases" },
  { slug: "urinary-tract-infections", title: "Urinary tract infections", blurb: "Symptoms, treatment and prevention.", group: "Long-term conditions", source: "urinarytractinfections", term: "urinary tract infections" },

  { slug: "burns", title: "Burns", blurb: "Types of burns and how they are treated.", group: "Skin, injury and first aid", source: "burns", term: "burns", q: "burn" },
  { slug: "sprains-and-strains", title: "Sprains and strains", blurb: "Injured ligaments and muscles: care and recovery.", group: "Skin, injury and first aid", source: "sprainsandstrains", term: "sprains and strains", q: "crepe bandage" },
  { slug: "heat-illness", title: "Heat illness", blurb: "Heat cramps, heat exhaustion and heat stroke.", group: "Skin, injury and first aid", source: "heatillness", term: "heat illness", q: "ORS" },
  { slug: "allergy", title: "Allergy", blurb: "Allergic reactions, triggers and treatment.", group: "Skin, injury and first aid", source: "allergy", term: "allergy", q: "cetirizine" },
  { slug: "skin-infections", title: "Skin infections", blurb: "Bacterial, viral and fungal infections of the skin.", group: "Skin, injury and first aid", source: "skininfections", term: "skin infections", q: "antiseptic" },
];

export const topicBySlug = (slug: string) => TOPICS.find((t) => t.slug === slug);
