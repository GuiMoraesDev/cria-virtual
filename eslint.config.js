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
);
