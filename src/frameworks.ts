import pc from "picocolors";

export interface Variant {
  name: string;
  display: string;
  color: (str: string) => string;
  customCommand?: string;
}

export interface Framework {
  name: string;
  display: string;
  color: (str: string) => string;
  variants?: Variant[];
}

export const frameworks: Framework[] = [
  {
    name: "react",
    display: "React",
    color: pc.blue,
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
    display: "Vue",
    color: pc.green,
    variants: [
      {
        name: "vue-app",
        display: "Vue 3 + Vite",
        color: pc.green,
      },
    ],
  },
  {
    name: "vanilla",
    display: "Vanilla",
    color: pc.yellow,
    variants: [
      {
        name: "vite-vanilla",
        display: "Vite",
        color: pc.yellow,
      },
    ],
  },
];
