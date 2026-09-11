// IPA Dictionary & Converter for English Words in Shadowing
// Provides word-by-word International Phonetic Alphabet (IPA) transcriptions

import { lookupLexiconWord } from "@/lib/foundation/vocabulary/lexicon-db.service";

export interface WordIpaToken {
  word: string;
  cleanWord: string;
  ipa: string;
  isPunctuation?: boolean;
}

// Common High-Frequency Words IPA Map (Oxford/General American & RP)
export const COMMON_IPA_MAP: Record<string, string> = {
  // Articles & Demonstratives
  a: "ə",
  an: "æn",
  the: "ðə",
  this: "ðɪs",
  that: "ðæt",
  these: "ðiːz",
  those: "ðəʊz",

  // Pronouns
  i: "aɪ",
  you: "juː",
  he: "hiː",
  she: "ʃiː",
  it: "ɪt",
  we: "wiː",
  they: "ðeɪ",
  me: "miː",
  him: "hɪm",
  her: "hɜː",
  us: "ʌs",
  them: "ðɛm",
  my: "maɪ",
  your: "jɔː",
  his: "hɪz",
  its: "ɪts",
  our: "aʊə",
  their: "ðeə",
  mine: "maɪn",
  yours: "jɔːz",
  hers: "hɜːz",
  ours: "aʊəz",
  theirs: "ðeəz",
  who: "huː",
  whom: "huːm",
  whose: "huːz",
  what: "wɒt",
  which: "wɪʧ",
  where: "weə",
  when: "wɛn",
  why: "waɪ",
  how: "haʊ",

  // Auxiliary & Common Verbs
  be: "biː",
  am: "æm",
  is: "ɪz",
  are: "ɑː",
  was: "wɒz",
  were: "wɜː",
  been: "biːn",
  being: "ˈbiːɪŋ",
  have: "hæv",
  has: "hæz",
  had: "hæd",
  having: "ˈhævɪŋ",
  do: "duː",
  does: "dʌz",
  did: "dɪd",
  doing: "ˈduːɪŋ",
  done: "dʌn",
  will: "wɪl",
  would: "wʊd",
  shall: "ʃæl",
  should: "ʃʊd",
  can: "kæn",
  could: "kʊd",
  may: "meɪ",
  might: "maɪt",
  must: "mʌst",
  say: "seɪ",
  said: "sɛd",
  says: "sɛz",
  go: "gəʊ",
  goes: "gəʊz",
  went: "wɛnt",
  gone: "gɒn",
  get: "gɛt",
  gets: "gɛts",
  got: "gɒt",
  make: "meɪk",
  makes: "meɪks",
  made: "meɪd",
  know: "nəʊ",
  knew: "njuː",
  known: "nəʊn",
  take: "teɪk",
  took: "tʊk",
  taken: "ˈteɪkən",
  see: "siː",
  saw: "sɔː",
  seen: "siːn",
  come: "kʌm",
  came: "keɪm",
  think: "θɪŋk",
  thought: "θɔːt",
  look: "lʊk",
  want: "wɒnt",
  give: "gɪv",
  gave: "geɪv",
  given: "ˈgɪvən",
  use: "juːz",
  find: "faɪnd",
  tell: "tɛl",
  told: "təʊld",
  ask: "ɑːsk",
  work: "wɜːk",
  seem: "siːm",
  feel: "fiːl",
  try: "traɪ",
  leave: "liːv",
  call: "kɔːl",
  need: "niːd",
  help: "hɛlp",
  talk: "tɔːk",
  start: "stɑːt",
  show: "ʃəʊ",
  hear: "hɪə",
  heard: "hɜːd",
  play: "pleɪ",
  run: "rʌn",
  move: "muːv",
  like: "laɪk",
  live: "lɪv",
  believe: "bɪˈliːv",
  hold: "həʊld",
  bring: "brɪŋ",
  brought: "brɔːt",
  happen: "ˈhæpən",
  write: "raɪt",
  wrote: "rəʊt",
  written: "ˈrɪtn",
  provide: "prəˈvaɪd",
  sit: "sɪt",
  stand: "stænd",
  lose: "luːz",
  pay: "peɪ",
  meet: "miːt",
  include: "ɪnˈkluːd",
  continue: "kənˈtɪnjuː",
  set: "sɛt",
  learn: "lɜːn",
  change: "ʧeɪnʤ",
  lead: "liːd",
  understand: "ˌʌndəˈstænd",
  watch: "wɒʧ",
  follow: "ˈfɒləʊ",
  stop: "stɒp",
  create: "kriːˈeɪt",
  speak: "spiːk",
  spoke: "spəʊk",
  spoken: "ˈspəʊkən",
  read: "riːd",
  spend: "spɛnd",
  grow: "grəʊ",
  open: "ˈəʊpən",
  walk: "wɔːk",
  win: "wɪn",
  offer: "ˈɒfə",
  remember: "rɪˈmɛmbə",
  love: "lʌv",
  consider: "kənˈsɪdə",
  appear: "əˈpɪə",
  buy: "baɪ",
  serve: "sɜːv",
  die: "daɪ",
  send: "sɛnd",
  sent: "sɛnt",
  expect: "ɪksˈpɛkt",
  build: "bɪld",
  stay: "steɪ",
  fall: "fɔːl",
  cut: "kʌt",
  reach: "riːʧ",
  kill: "kɪl",
  remain: "rɪˈmeɪn",

  // Office & Email vocabulary (from Corodomo screenshot)
  email: "ˈiːmeɪl",
  emails: "ˈiːmeɪlz",
  formal: "ˈfɔːməl",
  informal: "ɪnˈfɔːməl",
  friendly: "ˈfrɛndli",
  difficult: "ˈdɪfɪkəlt",
  more: "mɔː",
  than: "ðæn",
  although: "ɔːlˈðəʊ",
  at: "æt",
  times: "taɪmz",
  time: "taɪm",
  smiley: "ˈsmaɪli",
  face: "feɪs",
  from: "frɒm",
  someone: "ˈsʌmwʌn",
  never: "ˈnɛvə",
  before: "bɪˈfɔː",
  then: "ðɛn",
  but: "bʌt",
  id: "aɪd",
  "i'd": "aɪd",
  "it's": "ɪts",
  itself: "ɪtˈsɛlf",
  "i'm": "aɪm",
  "we're": "wɪə",
  "they're": "ðeə",
  "you're": "jɔː",
  "don't": "dəʊnt",
  "doesn't": "ˈdʌznt",
  "didn't": "ˈdɪdnt",
  "won't": "wəʊnt",
  "can't": "kɑːnt",
  "couldn't": "ˈkʊdnt",
  "shouldn't": "ˈʃʊdnt",
  still: "stɪl",
  probably: "ˈprɒbəbli",
  hi: "haɪ",
  rather: "ˈrɑːðə",
  dear: "dɪə",
  technicalities: "ˌtɛknɪˈkælətiz",
  regards: "rɪˈgɑːdz",
  wishes: "ˈwɪʃɪz",
  wish: "wɪʃ",
  kind: "kaɪnd",
  best: "bɛst",
  today: "təˈdeɪ",
  office: "ˈɒfɪs",
  english: "ˈɪŋglɪʃ",
  learning: "ˈlɜːnɪŋ",
  language: "ˈlæŋgwɪʤ",
  whoever: "huːˈɛvə",
  sending: "ˈsɛndɪŋ",
  hello: "hɛˈləʊ",
  welcome: "ˈwɛlkəm",
  brand: "brænd",
  new: "njuː",
  business: "ˈbɪznɪs",
  podcast: "ˈpɒdkɑːst",
  series: "ˈsɪəriːz",
  pippa: "ˈpɪpə",
  phil: "fɪl",
  episode: "ˈɛpɪsəʊd",

  // Prepositions & Conjunctions
  in: "ɪn",
  on: "ɒn",
  to: "tuː",
  for: "fɔː",
  with: "wɪð",
  about: "əˈbaʊt",
  against: "əˈgɛnst",
  between: "bɪˈtwiːn",
  into: "ˈɪntuː",
  through: "θruː",
  during: "ˈdjʊərɪŋ",
  under: "ˈʌndə",
  above: "əˈbʌv",
  up: "ʌp",
  down: "daʊn",
  off: "ɒf",
  over: "ˈəʊvə",
  and: "ænd",
  or: "ɔː",
  so: "səʊ",
  because: "bɪˈkɒz",
  as: "æz",
  if: "ɪf",
  while: "waɪl",
  until: "ənˈtɪl",
  after: "ˈɑːftə",
  since: "sɪns",

  // Common Adjectives & Adverbs
  good: "gʊd",
  great: "greɪt",
  first: "fɜːst",
  last: "lɑːst",
  long: "lɒŋ",
  little: "ˈlɪtl",
  own: "əʊn",
  other: "ˈʌðə",
  old: "əʊld",
  right: "raɪt",
  big: "bɪg",
  high: "haɪ",
  different: "ˈdɪfrənt",
  small: "smɔːl",
  large: "lɑːʤ",
  next: "nɛkst",
  early: "ˈɜːli",
  young: "jʌŋ",
  important: "ɪmˈpɔːtənt",
  few: "fjuː",
  public: "ˈpʌblɪk",
  bad: "bæd",
  same: "seɪm",
  able: "ˈeɪbl",
  not: "nɒt",
  now: "naʊ",
  always: "ˈɔːlweɪz",
  often: "ˈɒfn",
  sometimes: "ˈsʌmtaɪmz",
  usually: "ˈjuːʒʊəli",
  really: "ˈrɪəli",
  very: "ˈvɛri",
  just: "ʤʌst",
  also: "ˈɔːlsəʊ",
  well: "wɛl",
  only: "ˈəʊnli",
  even: "ˈiːvən",
  back: "bæk",
  there: "ðeə",
  here: "hɪə",
  too: "tuː",
  much: "mʌʧ",
  any: "ˈɛni",
  all: "ɔːl",
  both: "bəʊθ",
  such: "sʌʧ",
  no: "nəʊ",
};

/**
 * Clean a word token and look up its IPA
 */
export function getWordIpa(rawWord: string): string {
  const clean = rawWord.toLowerCase().replace(/[^\w']/g, "");
  if (!clean) return "";

  // 1. Check local high-frequency map
  if (COMMON_IPA_MAP[clean]) {
    return COMMON_IPA_MAP[clean];
  }

  // Handle common contractions
  const cleanNoApos = clean.replace(/'/g, "");
  if (COMMON_IPA_MAP[cleanNoApos]) {
    return COMMON_IPA_MAP[cleanNoApos];
  }

  // 2. Check local CEFR Lexicon Database
  const match = lookupLexiconWord(clean);
  if (match?.ipaUS) {
    return match.ipaUS.replace(/^\/|\/$/g, "");
  }
  if (match?.ipaUK) {
    return match.ipaUK.replace(/^\/|\/$/g, "");
  }

  // 3. Fallback: Heuristic phonetic generation
  return generatePhoneticApproximation(clean);
}

/**
 * Rules-based phonetic synthesizer fallback for rare words
 */
function generatePhoneticApproximation(word: string): string {
  let w = word.toLowerCase();

  w = w
    .replace(/tion/g, "ʃən")
    .replace(/sion/g, "ʒən")
    .replace(/cial/g, "ʃəl")
    .replace(/tial/g, "ʃəl")
    .replace(/cious/g, "ʃəs")
    .replace(/tious/g, "ʃəs")
    .replace(/ough/g, "ɔː")
    .replace(/ight/g, "aɪt")
    .replace(/ph/g, "f")
    .replace(/th/g, "θ")
    .replace(/ch/g, "ʧ")
    .replace(/sh/g, "ʃ")
    .replace(/ee/g, "iː")
    .replace(/ea/g, "iː")
    .replace(/oo/g, "uː")
    .replace(/ai/g, "eɪ")
    .replace(/ay/g, "eɪ")
    .replace(/oi/g, "ɔɪ")
    .replace(/oy/g, "ɔɪ")
    .replace(/ou/g, "aʊ")
    .replace(/ow/g, "aʊ")
    .replace(/qu/g, "kw")
    .replace(/ck/g, "k")
    .replace(/ng/g, "ŋ");

  return w;
}

/**
 * Split sentence into tokens with IPA for each word
 */
export function getSentenceWordsWithIpa(sentence: string): WordIpaToken[] {
  if (!sentence) return [];

  // Match words with apostrophes or punctuation tokens
  const rawTokens = sentence.split(/(\s+)/);

  const result: WordIpaToken[] = [];

  for (const token of rawTokens) {
    if (!token) continue;
    if (/^\s+$/.test(token)) {
      continue; // skip pure whitespace
    }

    const clean = token.toLowerCase().replace(/[^\w']/g, "");
    if (!clean) {
      result.push({
        word: token,
        cleanWord: token,
        ipa: "",
        isPunctuation: true,
      });
      continue;
    }

    const ipa = getWordIpa(clean);
    result.push({
      word: token,
      cleanWord: clean,
      ipa,
      isPunctuation: false,
    });
  }

  return result;
}
