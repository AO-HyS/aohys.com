import { extractCloudflarePagesDeploymentUrl } from "@aohys/release-train";

let input = "";

for await (const chunk of process.stdin) {
  input += chunk;
}

const deploymentUrl = extractCloudflarePagesDeploymentUrl(input);

if (!deploymentUrl) {
  console.error("Expected Wrangler output to include a Cloudflare Pages deployment URL.");
  process.exit(1);
}

console.log(deploymentUrl);
