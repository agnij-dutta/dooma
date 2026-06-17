// Focused probe: can we EXPORT verifiable attestation WITHOUT a funded ledger?
// These methods concern the PROVIDER's TEE attestation, not the caller's billing,
// so they may answer Risk #1 even though inference billing needs 3 OG.
import "dotenv/config";
import { ethers } from "ethers";

const RPC_URL = process.env.RPC_URL || "https://evmrpc-testnet.0g.ai";
let PK = process.env.PRIVATE_KEY;
if (PK && !PK.startsWith("0x")) PK = "0x" + PK;

const dump = (label, obj) => {
  console.log(`\n▸ ${label}:`);
  try {
    console.log(JSON.stringify(obj, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2));
  } catch {
    console.log(obj);
  }
};
const probe = async (obj, name, args) => {
  if (typeof obj[name] !== "function") return console.log(`\n✗ ${name}: not a function`);
  try {
    const r = await obj[name](...args);
    console.log(`\n✅ ${name}(${args.map((a) => JSON.stringify(a)).join(", ")}) ->`);
    dump("returned", r);
  } catch (e) {
    console.log(`\n⚠️  ${name} threw: ${e?.message || e}`);
  }
};

const mod = await import("@0gfoundation/0g-compute-ts-sdk");
const wallet = new ethers.Wallet(PK, new ethers.JsonRpcProvider(RPC_URL));
const broker = await mod.createZGComputeNetworkBroker(wallet);
const inf = broker.inference;

const services = await inf.listService();
const provider = services[0][0]; // first provider address
console.log("Provider under test:", provider, "model:", services[0][6], "verifiability:", services[0][7]);

// The exportable-proof candidates:
await probe(inf, "verifyService", [provider]);
await probe(inf, "checkProviderSignerStatus", [provider]);
await probe(inf, "getSignerRaDownloadLink", [provider]); // remote-attestation report link
await probe(inf, "downloadQuoteReport", [provider]); // TEE quote
await probe(inf, "acknowledged", [provider]);

console.log("\n\nINTERPRETATION:");
console.log("  If RA-download / quote-report return URLs or attestation bytes, then a");
console.log("  third party can independently verify the TEE+model out-of-band -> the");
console.log("  'Verify this verdict' button is REAL. (dstack verifier is open source.)");
