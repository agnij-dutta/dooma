// VERDICT — Day-1 de-risk spike.
//
// GOAL (the existential question for the whole project):
//   1. Can we run inference on 0G Compute's *verifiable* network at all?
//   2. Does processResponse() actually verify a TEE signature?
//   3. CRITICALLY: is the attestation / signature EXPORTABLE — i.e. can a third
//      party verify the verdict WITHOUT re-calling, or is verification only
//      app-internal? This determines whether the "Verify this verdict" button
//      is real or theater.
//
// This script is intentionally defensive: every step is wrapped, every returned
// object is dumped, and SDK method names are probed (they drift across versions).
// Run it, read the JSON it prints, and we adjust the real app from ground truth.
//
// Usage:  cp .env.example .env  (fill PRIVATE_KEY)  &&  npm install  &&  npm run spike

import "dotenv/config";
import { ethers } from "ethers";
import OpenAI from "openai";

// ---------- tiny logging helpers ----------
const line = (c = "─") => console.log(c.repeat(72));
const step = (n, t) => {
  line();
  console.log(`STEP ${n}: ${t}`);
  line();
};
const ok = (m) => console.log(`  ✅ ${m}`);
const warn = (m) => console.log(`  ⚠️  ${m}`);
const fail = (m) => console.log(`  ❌ ${m}`);
// dump shows the SHAPE of an object so we learn the real SDK surface
const dump = (label, obj) => {
  console.log(`  ▸ ${label}:`);
  try {
    console.log(
      JSON.stringify(obj, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2)
        .split("\n")
        .map((l) => "      " + l)
        .join("\n")
    );
  } catch {
    console.log("      [unserializable]", obj);
  }
};
const methodsOf = (o) => {
  if (!o) return [];
  const out = new Set();
  let p = o;
  while (p && p !== Object.prototype) {
    for (const k of Object.getOwnPropertyNames(p)) if (k !== "constructor") out.add(k);
    p = Object.getPrototypeOf(p);
  }
  return [...out].filter((k) => typeof o[k] === "function").sort();
};
// call the first method that exists from a list of candidate names
const tryCall = async (obj, names, args = [], label = "") => {
  for (const n of names) {
    if (obj && typeof obj[n] === "function") {
      try {
        const r = await obj[n](...args);
        ok(`${label || n} -> ${n}() ok`);
        return { name: n, result: r };
      } catch (e) {
        warn(`${n}() threw: ${e?.message || e}`);
        return { name: n, error: e };
      }
    }
  }
  warn(`${label || "method"}: none of [${names.join(", ")}] exist on object`);
  return null;
};

const RPC_URL = process.env.RPC_URL || "https://evmrpc-testnet.0g.ai";
const LEDGER_FUND_OG = process.env.LEDGER_FUND_OG || "0.1";
let PRIVATE_KEY = process.env.PRIVATE_KEY || "";
if (PRIVATE_KEY && !PRIVATE_KEY.startsWith("0x")) PRIVATE_KEY = "0x" + PRIVATE_KEY;

async function main() {
  console.log("\n🏛️  VERDICT spike — probing 0G verifiable inference\n");

  // ---- STEP 0: import the broker (new SDK first, deprecated fallback) ----
  step(0, "Load 0G compute SDK");
  let mod, pkgName;
  for (const name of ["@0gfoundation/0g-compute-ts-sdk", "@0glabs/0g-serving-broker"]) {
    try {
      mod = await import(name);
      pkgName = name;
      ok(`imported ${name}`);
      break;
    } catch {
      /* try next */
    }
  }
  if (!mod) {
    fail("could not import either SDK package — run `npm install` in spike/ first.");
    process.exit(1);
  }
  console.log("  ▸ exports:", Object.keys(mod).join(", ") || "(none)");
  // Confirmed from SDK constants: testnet=16602, mainnet=16661 (chainlist's 16601 was wrong)
  const EXPECTED_CHAIN = mod.TESTNET_CHAIN_ID ? Number(mod.TESTNET_CHAIN_ID) : 16602;
  if (mod.TESTNET_CHAIN_ID) ok(`SDK says TESTNET_CHAIN_ID = ${mod.TESTNET_CHAIN_ID}`);
  const createBroker =
    mod.createZGComputeNetworkBroker ||
    mod.createZGServingNetworkBroker ||
    mod.default;
  if (typeof createBroker !== "function") {
    fail("No broker factory found among known export names.");
    console.log("  ▸ available exports:", Object.keys(mod));
    process.exit(1);
  }
  ok(`factory: ${createBroker.name || "(default export)"}`);

  // ---- STEP 1: wallet + chain ----
  step(1, "Connect wallet to 0G testnet");
  if (!PRIVATE_KEY) {
    fail("PRIVATE_KEY missing in .env — fill it with a funded Galileo testnet key.");
    console.log("  (You can still inspect import/exports above without a key.)");
    process.exit(1);
  }
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  let net, wallet, bal;
  try {
    net = await provider.getNetwork();
    wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    bal = await provider.getBalance(wallet.address);
    ok(`chainId = ${net.chainId}  (expected ${EXPECTED_CHAIN})`);
    if (Number(net.chainId) !== EXPECTED_CHAIN)
      warn(`RPC chainId ${net.chainId} != expected ${EXPECTED_CHAIN} — check RPC_URL.`);
    ok(`wallet  = ${wallet.address}`);
    ok(`balance = ${ethers.formatEther(bal)} OG`);
    if (bal === 0n) warn("zero balance — fund via the 0G faucet or ledger ops will fail.");
  } catch (e) {
    fail(`RPC/wallet error: ${e?.message || e}`);
    process.exit(1);
  }

  // ---- STEP 2: create broker ----
  step(2, "Create compute-network broker");
  let broker;
  try {
    broker = await createBroker(wallet);
    ok("broker created");
    console.log("  ▸ broker.ledger methods:", methodsOf(broker.ledger).join(", "));
    console.log("  ▸ broker.inference methods:", methodsOf(broker.inference).join(", "));
  } catch (e) {
    fail(`broker creation failed: ${e?.message || e}`);
    process.exit(1);
  }

  // ---- STEP 3: ledger (account funding) ----
  step(3, "Ensure a funded ledger account");
  const led = await tryCall(broker.ledger, ["getLedger", "getAccount"], [], "getLedger");
  if (led?.result) dump("ledger", led.result);
  if (!led?.result) {
    const fund = ethers.parseEther(LEDGER_FUND_OG);
    // different versions take OG-string, wei, or number — try in order
    await tryCall(
      broker.ledger,
      ["addLedger", "depositFund", "createLedger"],
      [LEDGER_FUND_OG],
      "addLedger(string)"
    ) ||
      (await tryCall(broker.ledger, ["addLedger"], [fund], "addLedger(wei)"));
  } else {
    ok("ledger already exists — skipping creation");
  }

  // ---- STEP 4: discover verifiable providers ----
  step(4, "List inference services / providers");
  const svc = await tryCall(
    broker.inference,
    ["listService", "listServices", "getServices"],
    [],
    "listService"
  );
  const services = Array.isArray(svc?.result) ? svc.result : svc?.result?.services || [];
  console.log(`  ▸ found ${services.length} service(s)`);
  services.slice(0, 8).forEach((s, i) => {
    const addr = s.provider || s.providerAddress || s.address;
    const verifiability = s.verifiability ?? s.verifiable ?? s.attestationType ?? "?";
    console.log(
      `     [${i}] provider=${addr}  model=${s.model || s.name || "?"}  verifiability=${verifiability}`
    );
  });
  if (services[0]) dump("service[0] full shape", services[0]);

  let providerAddr =
    process.env.PROVIDER_ADDRESS ||
    // prefer a service that advertises verifiability/TEE
    (services.find((s) => {
      const v = String(s.verifiability ?? s.verifiable ?? s.attestationType ?? "").toLowerCase();
      return v.includes("tee") || v.includes("teeml") || v === "true";
    }) || services[0])?.provider ||
    services[0]?.providerAddress ||
    services[0]?.address;

  if (!providerAddr) {
    fail("No provider address resolved — cannot continue to inference.");
    process.exit(1);
  }
  ok(`using provider: ${providerAddr}`);

  // ---- STEP 5: acknowledge provider signer (TEE signer registration) ----
  step(5, "Acknowledge provider signer");
  await tryCall(
    broker.inference,
    ["acknowledgeProviderSigner", "acknowledgeProvider", "ackProviderSigner"],
    [providerAddr],
    "acknowledgeProviderSigner"
  );

  // ---- STEP 6: service metadata (endpoint + model) ----
  step(6, "Get service metadata");
  const meta = await tryCall(
    broker.inference,
    ["getServiceMetadata", "getMetadata"],
    [providerAddr],
    "getServiceMetadata"
  );
  if (meta?.result) dump("serviceMetadata", meta.result);
  const endpoint = meta?.result?.endpoint || meta?.result?.url;
  const model = meta?.result?.model || meta?.result?.modelName;
  if (!endpoint) {
    fail("No endpoint from metadata — cannot call inference.");
    process.exit(1);
  }
  ok(`endpoint = ${endpoint}`);
  ok(`model    = ${model}`);

  // ---- STEP 7: signed request headers (single-use billing/auth) ----
  step(7, "Get single-use request headers");
  const question =
    "Reply with strict JSON only: {\"winner\":\"A|B\",\"confidence\":0-1,\"reasoning\":\"...\"}. " +
    "Dispute: Is the Earth's average distance to the Sun about 150 million km? " +
    "Party A says YES. Party B says NO. Rule on the fact.";
  const hdrs = await tryCall(
    broker.inference,
    ["getRequestHeaders", "getHeaders", "requestHeaders"],
    [providerAddr, question],
    "getRequestHeaders"
  );
  const headers = hdrs?.result || {};
  console.log("  ▸ header keys:", Object.keys(headers).join(", ") || "(none)");

  // ---- STEP 8: call inference (OpenAI-compatible) ----
  step(8, "Call verifiable inference");
  const openai = new OpenAI({ baseURL: endpoint, apiKey: "", defaultHeaders: headers });
  let completion;
  try {
    completion = await openai.chat.completions.create({
      model: model || "gpt-3.5-turbo",
      messages: [{ role: "user", content: question }],
      temperature: 0,
    });
    ok("inference returned");
    const answer = completion.choices?.[0]?.message?.content;
    const chatID = completion.id;
    console.log("  ▸ chatID:", chatID);
    console.log("  ▸ answer:", answer);

    // ---- STEP 9: THE KEY QUESTION — verify + inspect exportable attestation ----
    step(9, "Verify response + inspect exportable attestation  ⭐ THE CRUX");
    const verify = await tryCall(
      broker.inference,
      ["processResponse", "verifyResponse", "processChat"],
      [providerAddr, answer, chatID],
      "processResponse"
    );
    if (verify?.result !== undefined) {
      dump("processResponse return", verify.result);
      const v = verify.result;
      const isValid = v === true || v?.valid === true || v?.verified === true;
      if (isValid) ok("TEE signature VERIFIED ✅  — verifiable inference works on this network.");
      else warn("processResponse did not clearly report valid=true — inspect the dump above.");
    }

    // probe for anything that smells like an exportable proof/attestation
    step("9b", "Hunt for EXPORTABLE proof material (signature / attestation report)");
    const exportProbe = await tryCall(
      broker.inference,
      [
        "getAttestation",
        "getSignature",
        "getProof",
        "downloadAttestation",
        "verifyAttestation",
        "getResponseSignature",
      ],
      [providerAddr, completion.id],
      "attestation export"
    );
    if (exportProbe?.result) dump("exportable proof candidate", exportProbe.result);
    // also: is the signature embedded in the completion object itself?
    const blob = JSON.stringify(completion);
    const hints = ["signature", "attestation", "proof", "tee", "quote", "cert", "sign"].filter(
      (h) => blob.toLowerCase().includes(h)
    );
    console.log("  ▸ completion object contains hints:", hints.join(", ") || "(none found)");
    dump("full completion object", completion);

    line("═");
    console.log("VERDICT SPIKE SUMMARY");
    line("═");
    console.log(`  inference works:         ${completion ? "YES" : "NO"}`);
    console.log(
      `  processResponse verifies: ${verify?.result !== undefined ? "YES (see dump)" : "UNKNOWN"}`
    );
    console.log(
      `  exportable proof found:   ${
        exportProbe?.result || hints.length ? "MAYBE — inspect dumps above" : "NOT OBVIOUS"
      }`
    );
    console.log(
      "\n  → If exportable proof is NOT obvious, the 'Verify this verdict' button is\n" +
        "    app-internal only on this network. Decide: demo on mainnet, or be explicit\n" +
        "    that third-party verification is a mainnet feature (Risk #1 in SPEC.md).\n"
    );
  } catch (e) {
    fail(`inference call failed: ${e?.message || e}`);
    if (e?.response) dump("error.response", e.response?.data || e.response);
    console.log(
      "\n  Common causes: ledger not funded, provider offline, wrong endpoint/headers,\n" +
        "  or this provider is not actually serving. Try another PROVIDER_ADDRESS.\n"
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("\nUNCAUGHT:", e);
  process.exit(1);
});
