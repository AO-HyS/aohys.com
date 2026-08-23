import process from "node:process";

import { analyzeArchitecture, formatFitnessReport } from "./fitness-lib.mjs";

const report = analyzeArchitecture();
console.log(formatFitnessReport(report));
process.exit(report.ok ? 0 : 1);
