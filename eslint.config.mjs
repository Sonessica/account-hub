import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Cards render arbitrary user-supplied image URLs; forcing next/image would
  // route them through the server optimizer and change self-hosted behavior.
  { rules: { "@next/next/no-img-element": "off" } },
  // These legacy integrations synchronize browser state and imperative map/DOM
  // objects in effects. Keep the rest of the React rules enabled project-wide.
  {
    files: [
      "src/app/auth/**/*.tsx",
      "src/bento/editor/EditorContext.tsx",
      "src/bento/editor/ImageEditorModal.tsx",
      "src/bento/widgets/text/EmojiPicker.tsx",
      "src/components/ui/map.tsx",
      "src/design-system/foundation/theme/ThemeProvider.tsx",
    ],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  {
    files: [
      "src/components/ui/map.tsx",
      "src/design-system/patterns/Dropdown/Dropdown.tsx",
      "src/design-system/patterns/Tooltip/Tooltip.tsx",
    ],
    rules: { "react-hooks/refs": "off" },
  },
  // The MapLibre wrapper registers listeners once per map instance; adding
  // changing props re-creates the map. The legacy auth hook owns one subscription.
  {
    files: ["src/components/ui/map.tsx", "src/hooks/useAuth.ts"],
    rules: { "react-hooks/exhaustive-deps": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
