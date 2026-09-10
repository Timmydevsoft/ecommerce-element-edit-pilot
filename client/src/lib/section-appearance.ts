import { cn } from "@/lib/utils";
export type SectionAppearance = { textSize: string; spacing: string; alignment: string; background: string; textColor: string; visible: boolean };
const sizes: Record<string, string> = { "text-2xl": "!text-2xl sm:!text-2xl lg:!text-2xl", "text-3xl": "!text-3xl sm:!text-3xl lg:!text-3xl", "text-4xl": "!text-4xl sm:!text-4xl lg:!text-4xl", "text-5xl": "!text-5xl sm:!text-5xl lg:!text-5xl", "text-6xl": "!text-6xl sm:!text-6xl lg:!text-6xl" };
const spacing: Record<string, string> = { "py-8": "!py-8 sm:!py-8 lg:!py-8", "py-12": "!py-12 sm:!py-12 lg:!py-12", "py-16": "!py-16 sm:!py-16 lg:!py-16", "py-20": "!py-20 sm:!py-20 lg:!py-20", "py-24": "!py-24 sm:!py-24 lg:!py-24", "py-28": "!py-28 sm:!py-28 lg:!py-28" };
const alignment: Record<string, string> = { "text-left": "text-left", "text-center": "text-center", "text-right": "text-right" };
const backgrounds: Record<string, string> = { "bg-background": "!bg-background bg-none", "bg-card": "!bg-card bg-none", "bg-muted": "!bg-muted bg-none", "bg-secondary": "!bg-secondary bg-none", "bg-primary": "!bg-primary bg-none" };
const colours: Record<string, string> = { "text-foreground": "text-foreground", "text-muted-foreground": "text-muted-foreground", "text-primary-foreground": "text-primary-foreground" };
export function sectionAppearance(value: SectionAppearance) { return { root: cn(backgrounds[value.background], colours[value.textColor], alignment[value.alignment], spacing[value.spacing], !value.visible && "hidden"), heading: sizes[value.textSize] }; }
