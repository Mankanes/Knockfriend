// ============================================================
// PROFANITY FILTER - cenzura zakazanych slov
// ============================================================
// Detekuje slova i s ruznymi kombinacemi (leetspeak, mezery, diakritika)

// Slovnik zakazanych slov (lowercase, bez diakritiky)
// Pridej dalsi podle potreby. Pouzivame "minimal substring" - cim kratsi tim casteji false positives.
const BANNED_WORDS = [
  // Anglicke
  "nigger", "nigga", "faggot", "fag",
  "retard", "retarded",
  "cunt", "whore", "slut", "bitch",
  "fuck", "fuk", "fck", "fack", "fak", "shit",
  "asshole", "dickhead",
  "pussy", "cock", "dick",
  "rape", "raped",
  "kill yourself", "kys", "kill urself",
  "nazi", "hitler",
  "pedo", "pedophile",
  "incel",

  // Ceske
  "kurva", "kurv", "kkt", "kokot", "kunda", "piča", "pica",
  "mrdka", "mrdat", "sracka", "hovno",
  "buzerant", "buzna", "buzik",
  "cigan", "zid",
  "negr", "cernoch",
  "debil", "debyl",
  "pjcha", "kkot",
  "zabij se", "zabit se",
];

// Normalizace - vrati lowercase bez diakritiky a se zakladnimi leetspeak substituci
function normalize(s) {
  if (typeof s !== "string") return "";
  let n = s.toLowerCase();
  // Odstran diakritiku (š -> s, č -> c, etc.)
  n = n.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Leetspeak: cisla -> pismena
  n = n
    .replace(/4/g, "a")
    .replace(/@/g, "a")
    .replace(/3/g, "e")
    .replace(/1/g, "i")
    .replace(/!/g, "i")
    .replace(/0/g, "o")
    .replace(/5/g, "s")
    .replace(/\$/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b");
  return n;
}

// Vrati true pokud text obsahuje zakazane slovo (i s pokusem o obejiti)
function containsProfanity(text) {
  if (!text) return false;
  const normalized = normalize(text);
  // Verze bez mezer/oddelovacu (pro detekci "n i g g e r")
  const stripped = normalized.replace(/[\s\-_.,;:'"`*+=()[\]{}/\\|<>?!]/g, "");
  // Verze s opakovanymi pismeny stlaceny na jedno (n i g g g g e r -> niger)
  const dedup = stripped.replace(/(.)\1{2,}/g, "$1$1");

  for (const word of BANNED_WORDS) {
    const w = normalize(word);
    // Test puvodni text
    if (normalized.includes(w)) return true;
    // Test bez mezer
    if (stripped.includes(w)) return true;
    // Test s odstranenym opakovanim
    if (dedup.includes(w)) return true;
    // Test bez mezer + odstranene opakovani
    const wDedup = w.replace(/(.)\1{2,}/g, "$1$1");
    if (dedup.includes(wDedup)) return true;
  }
  return false;
}

// Nahradi zakazana slova hvezdickami (pro chat - cenzuruje, ne blokuje)
function censorText(text) {
  if (!text) return text;
  let result = text;
  for (const word of BANNED_WORDS) {
    // Vytvor regex co najde slovo i s nahradou
    const w = word.toLowerCase();
    // Vytvor pattern ktery povoluje:
    // - puvodni pismeno NEBO leetspeak ekvivalent (a->4, e->3...)
    // - libovolnou diakritiku
    // - mezery/oddelovace mezi pismeny
    const charPatterns = {
      a: "[a@4àáâãäåā]",
      b: "[b8]",
      c: "[cçć]",
      d: "[d]",
      e: "[e3èéêëē]",
      f: "[f]",
      g: "[g9]",
      h: "[h]",
      i: "[i1!ìíîï]",
      j: "[j]",
      k: "[k]",
      l: "[l]",
      m: "[m]",
      n: "[nñń]",
      o: "[o0òóôõöø]",
      p: "[p]",
      q: "[q]",
      r: "[rř]",
      s: "[s5$šś]",
      t: "[t7ť]",
      u: "[uùúûüū]",
      v: "[v]",
      w: "[w]",
      x: "[x]",
      y: "[yýÿ]",
      z: "[z2žź]",
    };
    let pattern = "";
    for (const ch of w) {
      pattern += charPatterns[ch] || ch;
      // Povolen libovolny separator nebo opakovani mezi pismeny
      pattern += "[\\s\\-_.*]*";
    }
    // Odstran posledni separator
    pattern = pattern.replace(/\[\\s\\-_\.\*\]\*$/, "");
    try {
      const re = new RegExp(pattern, "gi");
      result = result.replace(re, (match) => "*".repeat(match.length));
    } catch (err) {
      // Pokud regex selhal, fallback
    }
  }
  return result;
}

module.exports = { containsProfanity, censorText, normalize };