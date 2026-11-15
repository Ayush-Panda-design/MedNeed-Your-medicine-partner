// Content for the photo-led homepage sections: health-concern cards, offer banners and the store branches.
//
// photo: optional path to an image in /public (WebP, landscape ~1200×900 for concerns, ~1200×700 for banners,
//        ~1200×800 for store photos). When unset, the section shows MedNeed's own illustration instead, so the
//        page always looks finished. Only use photos that are licensed for commercial use (Unsplash/Pexels licence)
//        or the client's own; avoid identifiable people shown as patients.

export type Concern = { name: string; blurb: string; q: string; art: string; photo?: string };

export const CONCERNS: Concern[] = [
  { name: "Fever & pain", blurb: "Paracetamol, thermometers, pain relief", q: "paracetamol", art: "pain-relief", photo: "/concerns/fever.webp" },
  { name: "Cold & flu", blurb: "Cough syrups, nasal sprays, lozenges", q: "cold", art: "cold-cough", photo: "/concerns/cold.webp" },
  { name: "Diabetes care", blurb: "Glucometers, strips, sugar-free", q: "diabetes", art: "diabetes-care", photo: "/concerns/diabetes.webp" },
  { name: "Heart & BP", blurb: "BP monitors, heart-care essentials", q: "blood pressure", art: "heart-care", photo: "/concerns/bp.webp" },
  { name: "Acidity & digestion", blurb: "Antacids, digestives, ORS", q: "antacid", art: "digestive-care", photo: "/concerns/acidity.webp" },
  { name: "Immunity", blurb: "Vitamin C, D3, zinc, multivitamins", q: "vitamin", art: "vitamins", photo: "/concerns/immunity.webp" },
  { name: "Skin & allergy", blurb: "Creams, anti-allergy, sunscreen", q: "skin", art: "skin-care", photo: "/concerns/skin.webp" },
  { name: "Baby care", blurb: "Gentle care for little ones", q: "baby", art: "baby-care", photo: "/concerns/baby.webp" },
];

export type Banner = { eyebrow: string; title: string; text: string; cta: string; href: string; art: string; from: string; to: string; photo?: string };

export const BANNERS: Banner[] = [
  {
    eyebrow: "Prescription orders",
    title: "Upload your prescription. We'll do the rest.",
    text: "A registered pharmacist checks it, packs your medicines and our rider brings them home.",
    cta: "Upload prescription",
    href: "/account/prescriptions/new",
    art: "devices",
    photo: "/banners/pharmacy.webp",
    from: "#0f5132",
    to: "#16a34a",
  },
  {
    eyebrow: "Immunity & vitamins",
    title: "Everyday strength for the whole family.",
    text: "Vitamin C, D3, zinc and multivitamins from trusted brands — genuine and never above MRP.",
    cta: "Shop vitamins",
    href: "/medicines?category=vitamins",
    art: "vitamins",
    photo: "/banners/vitamins.webp",
    from: "#7c2d12",
    to: "#ea580c",
  },
  {
    eyebrow: "Baby & mother care",
    title: "Gentle care for little ones.",
    text: "Baby lotions, diaper care, feeding essentials and more, delivered with care.",
    cta: "Shop baby care",
    href: "/medicines?category=baby-care",
    art: "baby-care",
    photo: "/banners/baby.webp",
    from: "#0c4a6e",
    to: "#0891b2",
  },
];

export type Branch = { name: string; area: string; address: string; pin: string; photo?: string };

export const BRANCHES: Branch[] = [
  { name: "Nakhara branch", area: "Nakhara, DPS Road", address: "Plot no. 1629, Nakhara, DPS Road, Bhubaneswar, Odisha", pin: "751032" },
  { name: "Rudhrapur branch", area: "Rudhrapur, Puri Canal Road", address: "842/1275, Puri Canal Road, Rudhrapur, Pahal / Balianta, Bhubaneswar, Odisha", pin: "751035" },
];

export const mapsUrl = (b: Branch) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`MED NEED pharmacy, ${b.address} ${b.pin}`)}`;
