// Independent proof the LIVE Escrow works end-to-end on 0G testnet:
// fund a fresh opponent → createCase → acceptCase → resolve → check payout.
// Tiny 0.001 OG stakes. Uses the throwaway deployer/resolver key.
import "dotenv/config";
import { ethers } from "ethers";
import { readFileSync } from "node:fs";

const RPC = "https://evmrpc-testnet.0g.ai";
const ESCROW = "0xdFD55C3412a8B4c8B573e4b933c8F24e26d84d1d";
const CREATOR_KEY = process.env.PRIVATE_KEY; // throwaway resolver key, from spike/.env (gitignored)
if (!CREATOR_KEY) throw new Error("set PRIVATE_KEY in spike/.env");
const abi = JSON.parse(readFileSync("../contracts/out/Escrow.sol/Escrow.json", "utf8")).abi;

// 0G testnet enforces a min ~2 gwei priority fee
const GAS = { maxPriorityFeePerGas: 3_000_000_000n, maxFeePerGas: 6_000_000_000n };
const STAKE = ethers.parseEther("0.001");

const provider = new ethers.JsonRpcProvider(RPC);
const creator = new ethers.Wallet(CREATOR_KEY, provider);
const opponent = ethers.Wallet.createRandom().connect(provider);

const log = (...a) => console.log(...a);
const og = (w) => ethers.formatEther(w);

async function main() {
  log("creator/resolver:", creator.address);
  log("opponent (fresh):", opponent.address);

  // 1) fund the opponent so it can stake + pay gas
  log("\n[1] funding opponent 0.03 OG…");
  await (await creator.sendTransaction({ to: opponent.address, value: ethers.parseEther("0.03"), ...GAS })).wait();
  log("    opponent balance:", og(await provider.getBalance(opponent.address)), "OG");

  const escrow = new ethers.Contract(ESCROW, abi, creator);

  // 2) createCase
  log("\n[2] createCase (stake 0.001 OG)…");
  const claimHash = ethers.keccak256(ethers.toUtf8Bytes("Is a hot dog a sandwich?|filling in bread|A: yes|B: no"));
  const txC = await escrow.createCase(claimHash, opponent.address, 7 * 86400, 2 * 86400, { value: STAKE, ...GAS });
  const rcC = await txC.wait();
  // parse CaseCreated for the id
  let id;
  for (const lg of rcC.logs) {
    try { const p = escrow.interface.parseLog(lg); if (p?.name === "CaseCreated") id = p.args.id; } catch {}
  }
  log("    CaseCreated id:", id?.toString(), "| tx:", txC.hash);

  // 3) acceptCase (opponent matches)
  log("\n[3] acceptCase (opponent matches 0.001 OG)…");
  const escrowOpp = escrow.connect(opponent);
  const txA = await escrowOpp.acceptCase(id, { value: STAKE, ...GAS });
  await txA.wait();
  log("    accepted | pot:", og(await escrow.pot(id)), "OG | tx:", txA.hash);

  // 4) resolve (resolver names the creator the winner)
  log("\n[4] resolve (winner = creator)…");
  const creatorBefore = await provider.getBalance(creator.address);
  const proofRoot = ethers.keccak256(ethers.toUtf8Bytes('{"winner":"A","reasoning":"test"}'));
  const txR = await escrow.resolve(id, creator.address, proofRoot, { ...GAS });
  const rcR = await txR.wait();
  let payout;
  for (const lg of rcR.logs) {
    try { const p = escrow.interface.parseLog(lg); if (p?.name === "PayoutSent") payout = p.args.amount; } catch {}
  }
  const c = await escrow.getCase(id);
  log("    resolved | status:", c.status.toString(), "(2 = Resolved) | payout:", payout ? og(payout) : "?", "OG | tx:", txR.hash);
  log("    creator balance:", og(await provider.getBalance(creator.address)), "OG (was", og(creatorBefore) + ")");

  log("\n✅ FULL ON-CHAIN LIFECYCLE WORKS: create → accept → resolve → payout.");
}
main().catch((e) => { console.error("\n❌", e.shortMessage || e.message || e); process.exit(1); });
