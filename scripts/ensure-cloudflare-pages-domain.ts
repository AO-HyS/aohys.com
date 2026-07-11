import {
  ensureCloudflarePagesDomain,
  parseCloudflareProductionDomainEnvironment,
} from "@aohys/release-train";

const config = parseCloudflareProductionDomainEnvironment(process.env);

const result = await ensureCloudflarePagesDomain({
  ...config,
  reconcileDns: true,
  dnsZoneAccount: "external",
});

console.log(
  `Cloudflare Pages domain ${result.domain.name} is active (${result.created ? "created" : "already configured"}).`,
);
