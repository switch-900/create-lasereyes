import pc from "picocolors";

export interface Variant {
  name: string;
  display: string;
  color: (str: string) => string;
  customCommand?: string;
  disabled?: boolean;
}

export interface Framework {
  name: string;
  display: string;
  color: (str: string) => string;
  variants?: Variant[];
  disabled?: boolean;
}

export const frameworks: Framework[] = [
  {
    name: "react",
    display: "React",
    color: pc.green,
    variants: [
      {
        name: "next-app",
        display: "Next.js (App Router)",
        color: pc.green,
      },
    ],
  },
  {
    name: "vue",
    display: "Vue: Coming Soon",
    color: pc.gray,
    disabled: true,
    variants: [
      {
        name: "vue-app",
        display: "Vue 3 + Vite",
        color: pc.gray,
      },
    ],
  },
  {
    name: "vanilla",
    display: "Vanilla: Coming Soon",
    color: pc.gray,
    disabled: true,
    variants: [
      {
        name: "vite-vanilla",
        display: "Vite",
        color: pc.gray,
      },
    ],
  },
];
