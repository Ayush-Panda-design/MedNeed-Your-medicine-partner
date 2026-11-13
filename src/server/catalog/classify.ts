/**
 * Rule-based therapeutic classification, the same idea large pharmacy catalogues use:
 * a product's section follows from its active ingredient(s) (like an ATC class), adjusted by dosage form.
 *
 * It is deliberately conservative. A product is only assigned when its ingredients clearly point to one
 * section (or a known combination rule resolves a mix). Everything else stays "Uncategorised" for a person
 * to place. Wrong placement is worse than no placement.
 */
export type CategorySlug =
  | "pain-relief" | "cold-cough" | "diabetes-care" | "heart-care" | "vitamins" | "digestive-care" | "skin-care" | "womens-care"
  | "infection-care" | "brain-nerve" | "eye-ear" | "respiratory-care" | "hormones-steroids";

/** Sections added in migration 0004 on top of the original ten. */
export const NEW_CATEGORIES: { slug: CategorySlug; name: string; icon: string; blurb: string; sort: number }[] = [
  { slug: "infection-care", name: "Infection Care", icon: "shield", blurb: "Antibiotics, antifungals, antivirals, antimalarials", sort: 25 },
  { slug: "respiratory-care", name: "Asthma & Breathing", icon: "wind", blurb: "Inhalers and medicines for asthma and COPD", sort: 28 },
  { slug: "brain-nerve", name: "Brain & Nerve Care", icon: "brain", blurb: "Sleep, mood, epilepsy, nerve and migraine care", sort: 55 },
  { slug: "eye-ear", name: "Eye & Ear Care", icon: "eye", blurb: "Eye drops, ear drops and related care", sort: 65 },
  { slug: "hormones-steroids", name: "Hormones & Steroids", icon: "activity", blurb: "Thyroid, corticosteroids and other hormones", sort: 85 },
];

const norm = (s: string) =>
  s.toLowerCase().replace(/\(.*?\)/g, " ").replace(/[^a-z0-9/ +-]/g, " ").replace(/\s+/g, " ").trim();

const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

const EXACT: Record<CategorySlug, string[]> = {
  "pain-relief": list(`paracetamol, paracetamol/acetaminophen, acetaminophen, aceclofenac, diclofenac, diclofenac diethylamine, diclofenac potassium, nimesulide, mefenamic acid,
    ibuprofen, aspirin, acetylsalicylic acid, etoricoxib, piroxicam, ketorolac, naproxen, lornoxicam, flurbiprofen, etodolac, indomethacin, rofecoxib, celecoxib, parecoxib, dexketoprofen, ketoprofen,
    thiocolchicoside, chlorzoxazone, tizanidine, metaxalone, cyclobenzaprine, methocarbamol, orphenadrine, eperisone, tolperisone, serratiopeptidase, trypsin, chymotrypsin, trypsin chymotrypsin, bromelain, rutoside,
    diacerein, glucosamine, glucosamine sulfate potassium chloride, chondroitin, methyl sulfonyl methane, flupirtine, tramadol, tapentadol, codeine, butorphanol, caffeine, methyl salicylate, capsaicin`),
  "cold-cough": list(`ambroxol, bromhexine, guaifenesin, dextromethorphan hydrobromide, dextromethorphan, levocetirizine, cetirizine, fexofenadine, bilastine, desloratadine, loratadine,
    chlorpheniramine maleate, chlorpheniramine, cyproheptadine, phenylephrine, pseudoephedrine, phenylpropanolamine, diphenhydramine, triprolidine, pheniramine, dexchlorpheniramine,
    ebastine, rupatadine, azelastine, xylometazoline, oxymetazoline, acetylcysteine, ammonium chloride, terpin hydrate, menthol, camphor, levodropropizine, codeine phosphate, tricholine citrate, doxylamine, carbocisteine, bepotastine`),
  "diabetes-care": list(`metformin, glimepiride, gliclazide, glipizide, glibenclamide, pioglitazone, vildagliptin, sitagliptin, teneligliptin, alogliptin, linagliptin, saxagliptin, voglibose, acarbose,
    dapagliflozin, empagliflozin, canagliflozin, repaglinide, nateglinide, liraglutide, semaglutide, epalrestat, insulin glargine, insulin aspart, insulin lispro, insulin degludec, human insulin, insulin`),
  "heart-care": list(`atorvastatin, rosuvastatin, simvastatin, pravastatin, pitavastatin, fenofibrate, ezetimibe, bempedoic acid, amlodipine, s-amlodipine, atenolol, metoprolol succinate, metoprolol tartrate, metoprolol,
    telmisartan, losartan, olmesartan medoxomil, azilsartan medoxomil, valsartan, candesartan, irbesartan, sacubitril, ramipril, lisinopril, enalapril, perindopril erbumine, perindopril, captopril, benazepril,
    bisoprolol, nebivolol, propranolol, carvedilol, labetalol, hydrochlorothiazide, chlorthalidone, indapamide, torasemide, furosemide, spironolactone, amiloride, eplerenone, cilnidipine, benidipine, azelnidipine,
    nifedipine, diltiazem, verapamil, clopidogrel, ticagrelor, prasugrel, apixaban, rivaroxaban, dabigatran etexilate, acenocoumarol, warfarin, enoxaparin, ivabradine, ranolazine, isosorbide mononitrate,
    isosorbide dinitrate, nitroglycerin, amiodarone, clonidine, methyldopa, tirofiban, trimetazidine, nicorandil, digoxin`),
  vitamins: list(`methylcobalamin, mecobalamin, cyanocobalamin, vitamin b6, vitamin b6 pyridoxine, pyridoxine, vitamin d3, cholecalciferol, vitamin b12, folic acid, l-methyl folate, l-methylfolate, thiamine, thiamine(vitamin b1),
    benfotiamine, biotin, vitamin c, ascorbic acid, vitamin e, vitamin k2, calcium, calcium carbonate, calcium citrate, calcitriol, alfacalcidol, iron sucrose, ferrous ascorbate, ferrous fumarate, ferrous sulphate,
    ferric carboxymaltose, iron, magnesium, zinc, zinc sulphate, zinc acetate, coenzyme q10, levo-carnitine, l-carnitine, alpha lipoic acid, taurine, lycopene, omega-3 fatty acids, amino acids, l-arginine,
    nicotinamide, niacinamide, vitamin b complex, multivitamin, vitamin a, riboflavin, vitamin b2, calcium pantothenate, selenium, chromium`),
  "digestive-care": list(`pantoprazole, rabeprazole, omeprazole, esomeprazole, lansoprazole, ilaprazole, dexlansoprazole, famotidine, ranitidine, domperidone, itopride, levosulpiride, ondansetron, simethicone, dimethicone,
    magaldrate, aluminium hydroxide, magnesium hydroxide, magnesium trisilicate, milk of magnesia, sucralfate, sodium bicarbonate, lactulose, sodium picosulfate, bisacodyl, polyethylene glycol, sorbitol,
    lactobacillus, lactobacillus acidophilus, lactic acid bacillus, saccharomyces boulardii, bacillus clausii, racecadotril, loperamide, drotaverine, dicyclomine, hyoscine butylbromide, camylofin, mebeverine,
    clidinium, cisapride, cinitapride, acotiamide, mosapride, pancreatin, ursodeoxycholic acid, l-ornithine l-aspartate, silymarin, oxetacaine, trimebutine, metoclopramide, prucalopride, ispaghula, domperidone maleate,
    activated charcoal, oral rehydration salts, rifaximin, lactase, fennel oil, dill oil`),
  "skin-care": list(`adapalene, benzoyl peroxide, isotretinoin, tretinoin, tazarotene, azelaic acid, hydroquinone, salicylic acid, minoxidil, aminexil, permethrin, lindane, acitretin, calamine, zinc pyrithione, urea,
    silver sulfadiazine, mupirocin, fusidic acid, retapamulin, ozenoxacin, sertaconazole, luliconazole, bifonazole, amorolfine, tacrolimus, pimecrolimus, chlorhexidine gluconate, chlorhexidine, cetrimide, kojic acid, glycolic acid, oxybenzone, avobenzone, zinc oxide`),
  "womens-care": list(`progesterone, progesterone natural micronized, dydrogesterone, norethisterone, norethindrone, allylestrenol, hydroxyprogesterone, clomiphene, mifepristone, misoprostol, estradiol, levonorgestrel, ulipristal,
    ethinylestradiol, ethinyl estradiol, drospirenone, desogestrel, cyproterone, dienogest, ormeloxifene`),
  "infection-care": list(`azithromycin, amoxycillin, amoxicillin, clavulanic acid, potassium clavulanate, sulbactam, tazobactum, tazobactam, cefixime, ofloxacin, amikacin, ceftriaxone, cefpodoxime proxetil, albendazole,
    cefuroxime, ornidazole, metronidazole, tinidazole, secnidazole, ampicillin, cloxacillin, dicloxacillin, ciprofloxacin, levofloxacin, moxifloxacin, gatifloxacin, norfloxacin, clindamycin, itraconazole, fluconazole,
    ketoconazole, voriconazole, terbinafine, miconazole, clotrimazole, artesunate, lumefantrine, artemether, arteether, alpha-beta arteether, ivermectin, mebendazole, praziquantel, pyrantel, acyclovir, valacyclovir,
    famciclovir, oseltamivir, favipiravir, linezolid, doxycycline, minocycline, erythromycin, clarithromycin, roxithromycin, cefadroxil, cefalexin, cephalexin, cefaclor, cefdinir, cefotaxime, cefepime, cefoperazone,
    ceftazidime, cefazolin, meropenem, imipenem, cilastatin, piperacillin, penicillin g, aztreonam, gentamicin, tobramycin, neomycin, chloramphenicol, rifampicin, isoniazid, ethambutol, pyrazinamide, dapsone,
    nitrofurantoin, trimethoprim, sulfamethoxazole, sulphamethoxazole, sulfadiazine, sulphadoxine, pyrimethamine, nalidixic acid, sparfloxacin, balofloxacin, faropenem, sultamicillin tosilate, colistimethate sodium,
    polymyxin b, amphotericin b, liposomal amphotericin b, caspofungin, anidulafungin, entecavir, lamivudine, abacavir, atazanavir, ritonavir, tenofovir, diloxanide, furazolidone, nitazoxanide, quinine, chloroquine,
    primaquine, diethylcarbamazine, levamisole, fosfomycin, vancomycin, teicoplanin, cefoperazone sodium, ceftriaxone sodium, nystatin, griseofulvin, flucytosine, povidone iodine`),
  "brain-nerve": list(`alprazolam, clonazepam, lorazepam, diazepam, chlordiazepoxide, etizolam, oxazepam, clobazam, nitrazepam, zolpidem, midazolam, buspirone, hydroxyzine, amitriptyline, nortriptyline, imipramine,
    clomipramine, dosulepin, melitracen, amoxapine, escitalopram oxalate, escitalopram, sertraline, fluoxetine, paroxetine, fluvoxamine, bupropion, duloxetine, venlafaxine, mirtazapine, aripiprazole, amisulpride,
    olanzapine, risperidone, quetiapine, clozapine, haloperidol, flupenthixol, trifluoperazine, pimozide, asenapine, blonanserin, lurasidone, lithium carbonate, atomoxetine, methylphenidate, armodafinil, modafinil,
    donepezil, memantine, piracetam, citicoline, levetiracetam, brivaracetam, sodium valproate, divalproex, valproic acid, carbamazepine, oxcarbazepine, phenobarbitone, phenytoin, lamotrigine, topiramate,
    gabapentin, pregabalin, betahistine, flunarizine, cinnarizine, trihexyphenidyl, levodopa, pramipexole, ropinirole, baclofen, almotriptan, sumatriptan, rizatriptan, disulfiram, acamprosate, metadoxine, melatonin,
    escitalopram`),
  "eye-ear": list(`brimonidine, timolol, brinzolamide, dorzolamide, bimatoprost, latanoprost, travoprost, tropicamide, olopatadine, alcaftadine, nepafenac, bromfenac, loteprednol etabonate, carboxymethylcellulose,
    hydroxypropylmethylcellulose, sodium hyaluronate, acetazolamide, naphazoline, tobramycin dexamethasone, sulphacetamide, sulfacetamide, proanthocyanidin, cyclopentolate, atropine, pilocarpine`),
  "respiratory-care": list(`montelukast, levosalbutamol, salbutamol, terbutaline, beclometasone, beclomethasone, budesonide, formoterol, salmeterol, tiotropium, ipratropium, fluticasone propionate, fluticasone furoate,
    theophylline, doxofylline, etofylline, aminophylline, acebrophylline, bambuterol, choline theophyllinate, glycopyrrolate, roflumilast, indacaterol, umeclidinium`),
  "hormones-steroids": list(`prednisolone, methylprednisolone, dexamethasone, deflazacort, hydrocortisone, betamethasone, triamcinolone, triamcinolone acetonide, nandrolone decanoate, testosterone, levothyroxine,
    thyroxine, liothyronine, carbimazole, methimazole, cabergoline, bromocriptine, desmopressin, octreotide acetate, fludrocortisone, mometasone, clobetasol, fluocinolone, halobetasol`),
};

const LOOKUP = new Map<string, CategorySlug>();
for (const [cat, names] of Object.entries(EXACT) as [CategorySlug, string[]][]) for (const n of names) if (!LOOKUP.has(n)) LOOKUP.set(norm(n), cat);

// Class-wide suffix/prefix rules for names not listed above. Checked after the exact table.
const AFFIX: [RegExp, CategorySlug][] = [
  [/(floxacin|cillin|mycin|micin|kacin|cycline|penem|bactam|bactum|conazole)$|^ce(f|ph)[a-z]+/, "infection-care"],
  [/(prazole|setron|tidine)$/, "digestive-care"],
  [/(sartan|pril|dipine|olol)$/, "heart-care"],
  [/(statin)$/, "heart-care"],
  [/(gliptin|gliflozin|glitazone|gliptin)$/, "diabetes-care"],
  [/(triptan)$/, "brain-nerve"],
  [/(azepam|azolam|barbitone|barbital)$/, "brain-nerve"],
  [/(oxetine|triptyline|pramine|apine|peridone|piprazole)$/, "brain-nerve"],
];

/** Salts that are never the deciding ingredient of a product. They are ignored when the rest of the product decides. */
const ADJUNCT = new Set(list(`caffeine, serratiopeptidase, trypsin, chymotrypsin, trypsin chymotrypsin, bromelain, rutoside, menthol, camphor, sodium bicarbonate, citric acid, glycerin, propylene glycol, phenoxyethanol,
  clavulanic acid, potassium clavulanate, sulbactam, tazobactum, tazobactam, cilastatin, lactobacillus, lactic acid bacillus, lactobacillus acidophilus, saccharomyces boulardii, bacillus clausii, sodium chloride,
  linseed oil, liquid paraffin, sorbitol, alpha lipoic acid`));

const TOPICAL = new Set(["Cream", "Ointment", "Gel", "Lotion"]);

export function classifySalt(name: string): CategorySlug | null {
  const n = norm(name);
  const hit = LOOKUP.get(n) ?? LOOKUP.get(n.replace(/ (hydrochloride|hcl|sodium|potassium|maleate|succinate|tartrate|besilate|mesylate|phosphate|sulphate|sulfate|acetate|citrate|bromide|oxalate|dipropionate|valerate)$/, ""));
  if (hit) return hit;
  for (const [re, cat] of AFFIX) if (re.test(n)) return cat;
  return null;
}

// When a product mixes ingredients from several sections, these pairs are well-known combinations with an obvious home.
// key wins over every section in its list.
const DOMINATES: Partial<Record<CategorySlug, CategorySlug[]>> = {
  "infection-care": ["digestive-care", "pain-relief", "vitamins", "skin-care", "hormones-steroids", "eye-ear", "cold-cough", "respiratory-care"],
  "brain-nerve": ["vitamins", "pain-relief", "digestive-care", "heart-care"],
  "cold-cough": ["pain-relief", "respiratory-care", "digestive-care", "vitamins", "eye-ear"],
  "pain-relief": ["digestive-care", "vitamins"],
  "digestive-care": ["vitamins"],
  "respiratory-care": ["hormones-steroids"],
  "diabetes-care": ["vitamins"],
  "heart-care": ["vitamins"],
  "womens-care": ["vitamins", "hormones-steroids"],
  "skin-care": ["hormones-steroids", "infection-care"],
  "eye-ear": ["hormones-steroids", "infection-care"],
};

/** Salts whose products are possible narcotic / psychotropic / tranquilizer items: flagged "never sold online" until a pharmacist clears them. */
export const RESTRICTED_SALTS = new Set(list(`alprazolam, clonazepam, lorazepam, diazepam, chlordiazepoxide, etizolam, oxazepam, clobazam, nitrazepam, zolpidem, midazolam, tramadol, tapentadol, codeine,
  codeine phosphate, morphine, fentanyl, pethidine, buprenorphine, butorphanol, pentazocine, methadone, phenobarbitone, phenobarbital, methylphenidate, ketamine, diphenoxylate, dextropropoxyphene`));

export function isRestricted(salts: string[]) {
  return salts.some((s) => RESTRICTED_SALTS.has(norm(s)));
}

export type Classified = { category: CategorySlug | null; restricted: boolean; reason: string };

export function classify(input: { name: string; form: string; salts: string[] }): Classified {
  const restricted = isRestricted(input.salts);
  const none = (reason: string): Classified => ({ category: null, restricted, reason });
  if (input.salts.length === 0) return none("no composition");

  const name = input.name.toLowerCase();
  const form = input.form;
  const topical = TOPICAL.has(form);

  // Eye and ear products are recognised by their name first: "Eye Drops", "Ear Drops", "Ophthalmic".
  if (/\b(eye|ophthalmic|ophthalmic solution|eyedrops)\b/.test(name) || /\b(ear drops?|otic)\b/.test(name)) return { category: "eye-ear", restricted, reason: "eye/ear product" };

  const cats = new Set<CategorySlug>();
  let unmapped = 0;
  let aspirin = false;
  const considered = input.salts.map((s) => ({ s: norm(s), c: classifySalt(s) }));
  for (const { s, c } of considered) {
    if (!c) { if (!ADJUNCT.has(s)) unmapped++; continue; }
    if (ADJUNCT.has(s)) continue;
    let cat: CategorySlug = c;
    // Same ingredient, different home depending on how it is used.
    if (topical && (cat === "hormones-steroids" || cat === "infection-care" || cat === "respiratory-care")) cat = "skin-care";
    else if (topical && cat === "cold-cough") cat = "skin-care"; // antihistamine/menthol creams
    else if (form === "Spray" && (s.startsWith("mometasone") || s.startsWith("fluticasone") || s.startsWith("budesonide") || s.startsWith("beclomet"))) cat = "cold-cough";
    else if (form === "Spray" && (s === "xylometazoline" || s === "oxymetazoline")) cat = "cold-cough";
    else if (/^(niacinamide|nicotinamide)$/.test(s) && topical) cat = "skin-care";
    else if (s === "povidone iodine" || s === "chlorhexidine gluconate" || s === "cetrimide") cat = "skin-care";
    else if (s === "diclofenac diethylamine") cat = "pain-relief";
    else if (s === "aspirin" || s === "acetylsalicylic acid") { aspirin = true; continue; }
    else if ((s === "hydroxyzine") && topical) cat = "skin-care";
    cats.add(cat);
  }
  // Aspirin is low-dose (heart) next to heart drugs or when named 75/81/100/150 mg, otherwise a painkiller.
  if (aspirin) {
    if (cats.has("heart-care") || (cats.size === 0 && /\b(75|81|100|150)\b/.test(name))) cats.add("heart-care");
    else cats.add("pain-relief");
  }
  // Adjunct-only products (e.g. a bare probiotic or enzyme) fall back to the adjunct's own section.
  if (cats.size === 0) {
    for (const { c } of considered) if (c) cats.add(c);
    if (cats.size === 0) return none("ingredients not recognised");
  }
  if (unmapped > 0 && cats.size >= 1) {
    // One unknown ingredient next to a recognised one is too risky to guess (it could be anything).
    return none("contains an unrecognised ingredient");
  }
  if (cats.size === 1) return { category: [...cats][0], restricted, reason: "single section" };

  // Combination: one section must dominate all the others present.
  for (const c of cats) {
    const beats = DOMINATES[c] ?? [];
    if ([...cats].every((o) => o === c || beats.includes(o))) return { category: c, restricted, reason: "combination rule" };
  }
  return none("mixed sections with no combination rule");
}
