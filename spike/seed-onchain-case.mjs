// Create + accept a real on-chain case so we can e2e-test the resolve API path.
// Prints a JSON line with the linkage the app store needs.
import "dotenv/config";
import { ethers } from "ethers";
import { readFileSync } from "node:fs";

const RPC = "https://evmrpc-testnet.0g.ai";
const ESCROW = "0xdFD55C3412a8B4c8B573e4b933c8F24e26d84d1d";
const CREATOR_KEY = process.env.PRIVATE_KEY; // from spike/.env (gitignored)
if (!CREATOR_KEY) throw new Error("set PRIVATE_KEY in spike/.env");
const abi = JSON.parse(readFileSync("../contracts/out/Escrow.sol/Escrow.json", "utf8")).abi;
const GAS = { maxPriorityFeePerGas: 3_000_000_000n, maxFeePerGas: 6_000_000_000n };
const STAKE = ethers.parseEther("0.001");

const provider = new ethers.JsonRpcProvider(RPC);
const creator = new ethers.Wallet(CREATOR_KEY, provider);
const opponent = ethers.Wallet.createRandom().connect(provider);

const escrow = new ethers.Contract(ESCROW, abi, creator);
await (await creator.sendTransaction({ to: opponent.address, value: ethers.parseEther("0.03"), ...GAS })).wait();
const claimHash = ethers.keccak256(ethers.toUtf8Bytes("e2e resolve test"));
const txC = await escrow.createCase(claimHash, opponent.address, 7 * 86400, 2 * 86400, { value: STAKE, ...GAS });
const rcC = await txC.wait();
let id;
for (const lg of rcC.logs) { try { const p = escrow.interface.parseLog(lg); if (p?.name === "CaseCreated") id = p.args.id; } catch {} }
const txA = await escrow.connect(opponent).acceptCase(id, { value: STAKE, ...GAS });
await txA.wait();
console.log(JSON.stringify({
  onchainId: Number(id),
  creatorAddress: creator.address,
  opponentAddress: opponent.address,
  txCreate: txC.hash,
  txAccept: txA.hash,
}));
