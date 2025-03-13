import pluginJs from "@eslint/js"
import pluginTypescript from "@typescript-eslint/eslint-plugin"
import pluginImport from "eslint-plugin-import"
import prettier from "eslint-plugin-prettier"
import globals from "globals"
import tseslint from "typescript-eslint"

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    files: ["**/*.{js,ts}"],
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      prettier,
      import: pluginImport,
      typescript: pluginTypescript,
    },
    rules: {
      "prettier/prettier": [
        "error",
        {
          tabWidth: 2,
          useTabs: false,
          semi: false,
          singleQuote: false,
          trailingComma: "all",
          printWidth: 80,
          arrowParens: "always",
          bracketSpacing: true,
        },
      ],
      "sort-imports": [
        "error",
        {
          ignoreCase: true,
          ignoreDeclarationSort: true,
        },
      ],
      // "import/order": [
      //   "error",
      //   {
      //     groups: [
      //       "type",
      //       "builtin",
      //       "external",
      //       "internal",
      //       "parent",
      //       "sibling",
      //       "index",
      //     ],
      //     "newlines-between": "always",
      //     alphabetize: {
      //       order: "asc",
      //       caseInsensitive: true,
      //     },
      //   },
      // ],
      "import/no-duplicates": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          disallowTypeAnnotations: false,
        },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
]
