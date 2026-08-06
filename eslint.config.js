"use strict";

module.exports = [
  {
    ignores: [
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "tests/output/**"
    ]
  },
  {
    files: ["*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        Blob: "readonly",
        DataView: "readonly",
        Date: "readonly",
        Error: "readonly",
        Math: "readonly",
        Number: "readonly",
        Object: "readonly",
        String: "readonly",
        TextEncoder: "readonly",
        Uint8Array: "readonly",
        Uint32Array: "readonly",
        URL: "readonly",
        document: "readonly",
        globalThis: "readonly",
        module: "readonly",
        window: "readonly"
      }
    },
    rules: {
      curly: "error",
      eqeqeq: "error",
      "no-undef": "error",
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "no-var": "error",
      "prefer-const": "error"
    }
  },
  {
    files: ["tests/**/*.js", "playwright.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        Buffer: "readonly",
        URL: "readonly",
        __dirname: "readonly",
        console: "readonly",
        document: "readonly",
        module: "readonly",
        process: "readonly",
        require: "readonly",
        setTimeout: "readonly",
        window: "readonly"
      }
    },
    rules: {
      curly: "error",
      eqeqeq: "error",
      "no-undef": "error",
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "no-var": "error",
      "prefer-const": "error"
    }
  }
];
