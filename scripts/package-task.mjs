import process from "node:process";

const [taskName, packageName] = process.argv.slice(2);
const allowedTasks = new Set(["build", "lint", "typecheck"]);

if (!taskName || !packageName) {
  console.error("Usage: node scripts/package-task.mjs <task> <package>");
  process.exit(1);
}

if (!allowedTasks.has(taskName)) {
  console.error(`Unsupported placeholder task: ${taskName}`);
  process.exit(1);
}

console.log(`${packageName}: ${taskName} placeholder passed.`);
