import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactNative from "eslint-plugin-react-native";
import prettier from "eslint-config-prettier";
import globals from "globals";
import base from "./base.js";

export default [
  ...base,
  { ignores: ["**/android/", "**/ios/", "**/.expo/", "**/vendor/"] },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: { react, "react-hooks": reactHooks, "react-native": reactNative },
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node, __DEV__: "readonly" },
    },
    // 'detect' can fail when react isn't resolvable from where ESLint runs,
    // so pin it explicitly in a monorepo
    settings: { react: { version: "19.2" } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-native/no-unused-styles": "warn",
      "react-native/no-inline-styles": "warn",
    },
  },
  prettier,
];
