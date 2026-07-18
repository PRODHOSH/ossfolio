import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export function capitalizeTech(name: string): string {
  const map: Record<string, string> = {
    javascript: "JavaScript",
    typescript: "TypeScript",
    python: "Python",
    rust: "Rust",
    go: "Go",
    css: "CSS",
    html: "HTML",
    sql: "SQL",
    react: "React",
    node: "Node.js",
  };
  return map[name.toLowerCase()] || name.charAt(0).toUpperCase() + name.slice(1);
}
