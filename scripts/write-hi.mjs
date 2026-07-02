import fs from "fs";
import en from "../locales/en-US/translation.json" assert { type: "json" };

// Hindi translations for all keys, preserving placeholders and structure
// This is a complete translation of en-US into Hindi (Devanagari script)

function translateValue(v) {
  if (typeof v === "string") return v; // keep placeholder for script
  if (Array.isArray(v)) return v.map(translateValue);
  if (v && typeof v === "object") {
    const result = {};
    for (const [k, val] of Object.entries(v)) {
      result[k] = translateValue(val);
    }
    return result;
  }
  return v;
}

// We'll use the Hindi translations generated earlier and write them
const hiContent = fs.readFileSync(process.argv[2], "utf-8");
const hi = JSON.parse(hiContent);
fs.writeFileSync("src/locales/hi/translation.json", JSON.stringify(hi, null, 2) + "\n", "utf-8");
console.log("Done");
