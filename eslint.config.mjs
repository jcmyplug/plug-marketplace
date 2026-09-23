/* ─── ESLINT FLAT CONFIG ─────────────────────────────────────────────────────
   ESLint 9 changed the default config format and ESLint 10 removed the old one
   entirely, so the eslintConfig block that used to live in package.json is no
   longer read. Same rules, new file.

   These are correctness rules only — things that are always a bug, never a
   matter of taste. There is deliberately no style layer: this codebase is one
   very large file written over months, and a formatter argument in CI would
   bury the findings that matter under hundreds that do not.

   no-undef is NOT enabled, which is why no globals are declared below. It was
   left off while the offenders were fixed and turning it on is a separate,
   deliberate change — see the note at the bottom.
────────────────────────────────────────────────────────────────────────────── */
export default [
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
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
    },
  },
];

/* Still to turn on, once their remaining offenders are fixed:
     no-undef      needs a globals list for the browser environment
     no-dupe-keys  caught a real bug once (a duplicate schedule key that
                   silently discarded a listing own schedule) */
