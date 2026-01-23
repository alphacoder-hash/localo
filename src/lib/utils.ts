import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDemoBanner(category: string): string {
  const c = category.toLowerCase();
  if (c.includes("veg") || c.includes("fruit") || c.includes("produce"))
    return "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80"; // Fruits/Veg
  if (c.includes("chai") || c.includes("tea") || c.includes("coffee") || c.includes("cafe"))
    return "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80"; // Chai
  if (c.includes("food") || c.includes("snack") || c.includes("meal") || c.includes("restaurant") || c.includes("bakery"))
    return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80"; // Food
  if (c.includes("cloth") || c.includes("fashion") || c.includes("wear") || c.includes("boutique"))
    return "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80"; // Clothes
  if (c.includes("repair") || c.includes("mechanic") || c.includes("service") || c.includes("cycle"))
    return "https://images.unsplash.com/photo-1632823471565-1ec2a1ad4015?auto=format&fit=crop&w=800&q=80"; // Repair
  
  // Default street market
  return "https://images.unsplash.com/photo-1472851294608-415522f96485?auto=format&fit=crop&w=800&q=80";
}
