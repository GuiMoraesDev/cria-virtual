import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: [".claude-plugin/types/**", "node_modules/**"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommended],
    rules: {
      "no-unreachable": "error",
      "@typescript-eslint/no-unused-vars": "error",
    },
  },
  {
    files: ["src/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: 'Identifier[name="h"]',
          message: "`h` and `Fragment` are names JSX can compile to; the plugin directory blocks them as values",
        },
        {
          selector: 'Identifier[name="Fragment"]',
          message: "`h` and `Fragment` are names JSX can compile to; the plugin directory blocks them as values",
        },
      ],
    },
  },
);
