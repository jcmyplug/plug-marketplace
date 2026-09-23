/* ─── ESLINT FLAT CONFIG ─────────────────────────────────────────────────────
   ESLint 9 changed the default config format and ESLint 10 removed the old one
   entirely, so the eslintConfig block that used to live in package.json is no
   longer read. Same rules, new file.

   These are correctness rules only — things that are always a bug, never a
   matter of taste. There is deliberately no style layer: this codebase is one
   very large file written over months, and a formatter argument in CI would
   bury the findings that matter under hundreds that do not.
────────────────────────────────────────────────────────────────────────────── */

/* Browser and JS globals, declared by hand.

   no-undef needs to be told what exists outside the module, and with nothing
   declared it would flag every `window` and `document` in the file. The usual
   answer is the `globals` package; this project has three direct dependencies
   and that record is worth more than the convenience, so the list is inline.

   readonly on purpose: assigning to `document` or `Promise` is a bug, and this
   makes it one ESLint reports rather than one a user discovers. */
const browserGlobals = Object.fromEntries([
  /* DOM and the browser environment */
  "window", "document", "navigator", "location", "history", "screen",
  "localStorage", "sessionStorage", "console", "alert", "confirm", "prompt",
  "fetch", "Headers", "Request", "Response", "FormData", "AbortController",
  "setTimeout", "clearTimeout", "setInterval", "clearInterval",
  "requestAnimationFrame", "cancelAnimationFrame", "queueMicrotask",
  "FileReader", "File", "Blob", "URL", "URLSearchParams", "Image", "Audio",
  "Event", "CustomEvent", "MouseEvent", "KeyboardEvent", "DOMParser",
  "IntersectionObserver", "ResizeObserver", "MutationObserver",
  "performance", "crypto", "structuredClone", "matchMedia", "getComputedStyle",
  "atob", "btoa", "scrollTo", "HTMLElement", "Node", "NodeList",
  /* ECMAScript built-ins */
  "globalThis", "Object", "Array", "String", "Number", "Boolean", "Symbol",
  "BigInt", "Math", "JSON", "Date", "RegExp", "Error", "TypeError",
  "RangeError", "Promise", "Set", "Map", "WeakSet", "WeakMap", "Proxy",
  "Reflect", "Intl", "parseInt", "parseFloat", "isNaN", "isFinite",
  "encodeURIComponent", "decodeURIComponent", "encodeURI", "decodeURI",
  /* Substituted at build time by vite.config.mjs, so it is real at runtime. */
  "process",
].map(name => [name, "readonly"]));

export default [
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: browserGlobals,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    rules: {
      /* Assignment where a comparison was meant. */
      "no-cond-assign": "error",
      "no-const-assign": "error",
      "no-dupe-args": "error",
      "no-duplicate-case": "error",
      "no-func-assign": "error",
      "no-obj-calls": "error",
      "no-redeclare": "error",
      "no-self-assign": "error",
      /* Code after a return. Usually a merge that went wrong. */
      "no-unreachable": "error",
      "no-unsafe-negation": "error",
      "no-unsafe-optional-chaining": "error",
      /* The rule that would have caught the temporal-dead-zone crash: a const
         read before its declaration. functions:false because hoisted function
         declarations are used deliberately throughout. */
      "no-use-before-define": [
        "error",
        { functions: false, classes: true, variables: false },
      ],
      "use-isnan": "error",
      "valid-typeof": "error",

      /* ── Turned on 23 September 2026 ───────────────────────────────────────
         Both of these were left off while their pre-existing offenders were
         cleaned up, with a note in the CI workflow listing four: an undefined
         `v` in a RecommendationsStrip handler, and three duplicate object keys.

         That note is now stale. RecommendationsStrip no longer exists in the
         file, and the duplicate keys went with the listing rewrites. Leaving
         the rules off "until someone gets to it" is how a temporary exception
         becomes permanent, so they go on now and CI decides whether that claim
         is true — a real ESLint run is worth more than anyone's reading of a
         13,000-line file.

         no-dupe-keys earned its place: a duplicate `schedule` key once silently
         discarded a listing's own availability, and the second value simply
         won with no error anywhere. no-undef is the one that catches a typo'd
         identifier in a rarely-hit event handler, which is a crash for the one
         user who takes that path and invisible to everyone else. */
      "no-undef": "error",
      "no-dupe-keys": "error",
    },
  },
];
