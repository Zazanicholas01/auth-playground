import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import icon from "astro-icon";

export default defineConfig({
  integrations: [
    icon(),
    starlight({
      title: "Platform Docs",
      sidebar: [
        {
          label: "Guides",
          autogenerate: { directory: "guides" },
        },
        {
          label: "Azure",
          autogenerate: { directory: "azure" },
        },
        {
          label: "Kubernetes CKA",
          autogenerate: { directory: "kubecka" },
        },
      ],
    }),
  ],
  output: "static",
});
