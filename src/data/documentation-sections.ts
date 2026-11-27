/*
 * The entries of the "Documentation" header menu: the documentation overview,
 * then one section for each kind of page in the Diátaxis model. The links
 * must match the links kept in `navLinks` (astro.config.mjs) for the mobile
 * menu.
 */
export interface DocumentationSection {
  label: string;
  description: string;
  href: string;
}

export const DOCUMENTATION_SECTIONS: DocumentationSection[] = [
  {
    label: "Overview",
    description: "Find the section that matches your need.",
    href: "/documentation/",
  },
  {
    label: "Tutorials",
    description: "Learn Xila through a guided first experience.",
    href: "/tutorials/",
  },
  {
    label: "How-to guides",
    description: "Complete a specific task, step by step.",
    href: "/how-to/",
  },
  {
    label: "Reference",
    description: "Look up exact commands, options and limits.",
    href: "/reference/",
  },
  {
    label: "Explanation",
    description: "Understand the architecture and its reasons.",
    href: "/explanation/",
  },
];
