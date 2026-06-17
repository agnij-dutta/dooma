import "server-only";
import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0gfoundation/0g-compute-ts-sdk";
import type { AttestationSummary } from "./types";

/**
 * KEYSTONE: live TEE attestation against the 0G Galileo testnet.
 *
 * Confirmed by the spike (probe-attestation.mjs) running against the real
 * testnet with an UNFUNDED wallet:
 *   - broker.inference.verifyService(provider) -> full client-side TEE check
 *     { success, teeVerifier:'dstack', verifierURL, reportsData:{broker:{quote,...}},
 *       signerVerification:{ allMatch, reportAddresses:[{address,match}] }, ... }
 *   - broker.inference.getSignerRaDownloadLink(provider) -> public RA report URL
 *
 * NO FUNDED LEDGER REQUIRED. This is the demo's spine.
 *
 * HONESTY: this proves a "verified TEE serving stack (dstack) + request
 * integrity" — NOT that a specific model produced an exact output. Copy must
 * never say "provably the model said it" (SPEC §3 NEVER-SAY).
 */

const RPC_URL = process.env.OG_RPC_URL ?? "https://evmrpc-testnet.0g.ai";

function getWallet(): ethers.Wallet | ethers.HDNodeWallet {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const pk = process.env.ATTESTATION_PRIVATE_KEY;
  if (pk) {
    const key = pk.startsWith("0x") ? pk : `0x${pk}`;
    return new ethers.Wallet(key, provider);
  }
  // verifyService needs no funds, so a random ephemeral wallet is fine.
  return ethers.Wallet.createRandom().connect(provider);
}

export async function fetchAttestation(provider: string): Promise<AttestationSummary> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(provider)) {
    throw new Error("invalid provider address");
  }
  const wallet = getWallet();
  const broker = await createZGComputeNetworkBroker(wallet as ethers.Wallet);

  // Public RA report URL + full client-side verification (parallel).
  const [raReportURL, verify] = await Promise.all([
    broker.inference.getSignerRaDownloadLink(provider),
    broker.inference.verifyService(provider),
  ]);

  // verify shape (confirmed live):
  //   success, teeVerifier, verifierURL,
  //   reportsData.broker.{quote,event_log,report_data,vm_config,tcb_info},
  //   signerVerification.{allMatch, reportAddresses:[{address,match,reportType}]},
  //   composeVerification
  const v = (verify ?? {}) as unknown as Record<string, unknown>;
  const reportsData = (v.reportsData ?? {}) as Record<string, { quote?: string }>;
  const brokerReport = reportsData.broker ?? {};
  const signer = (v.signerVerification ?? {}) as {
    allMatch?: boolean;
    reportAddresses?: Array<{ address: string; match: boolean }>;
  };
  const compose = (v.composeVerification ?? {}) as { isValid?: boolean; matched?: boolean };

  const quote = typeof brokerReport.quote === "string" ? brokerReport.quote : "";
  const quotePreview = quote ? `${quote.slice(0, 96)}…` : "(quote present in RA report)";

  return {
    provider,
    success: Boolean(v.success),
    teeVerifier: String(v.teeVerifier ?? "dstack"),
    verifierURL: String(v.verifierURL ?? "https://github.com/Dstack-TEE/dstack"),
    raReportURL: String(raReportURL),
    checks: {
      quoteValid: Boolean(v.success) && quote.length > 0,
      imageIntegrity: Boolean(compose.isValid ?? compose.matched ?? v.success),
      signerMatch: Boolean(signer.allMatch),
    },
    quotePreview,
    signerAddresses: (signer.reportAddresses ?? []).map((r) => r.address),
    fetchedAt: Date.now(),
  };
}
