module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:sonarjs/recommended-legacy"
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react", "react-hooks", "sonarjs"],
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "sonarjs/no-duplicate-string": ["warn", { "threshold": 5 }],
    "sonarjs/cognitive-complexity": ["warn", 20]
  },
  settings: {
    react: {
      version: "detect"
    }
  }
};
