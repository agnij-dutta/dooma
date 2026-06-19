export type CaseStatus = "open" | "in_session" | "decided";

export interface VerdictResult {
  /** "A" = creator, "B" = opponent */
  winner: "A" | "B";
  /** 0..1 model self-reported confidence */
  confidence: number;
  /** one-sentence ruling, used verbatim on the Verdict Card */
  reasoning: string;
  /** short cited basis (fact/source the ruling leans on) */
  citation: string;
}

export interface Case {
  id: string;
  title: string;
  /** the precise resolution question + ruling criterion */
  question: string;
  partyA: string; // label or address of creator
  partyB: string; // label or address of opponent
  evidenceA: string;
  evidenceB: string;
  /** stake per party, as a human string e.g. "0.5" (OG) */
  stake: string;
  /** TEE provider address used for the attestation */
  provider: string;
  status: CaseStatus;
  createdAt: number;
  /** free spectator hot-take tally */
  votesA: number;
  votesB: number;
  /** set once decided */
  verdict?: VerdictResult;
  /** which party won, denormalized for the card */
  winnerLabel?: string;
  loserLabel?: string;

  // --- on-chain linkage (hybrid: store holds content+votes, Escrow holds money) ---
  /** the Escrow contract case id this case is bound to (undefined = legacy/off-chain) */
  onchainId?: number;
  /** keccak256(question|criterion|evidenceA|evidenceB) committed on-chain */
  claimHash?: string;
  /** creator (Party A) wallet address — winner payout target if A wins */
  creatorAddress?: string;
  /** opponent (Party B) wallet address — the only address allowed to accept */
  opponentAddress?: string;
  /** tx hash of createCase */
  txCreate?: string;
  /** tx hash of acceptCase */
  txAccept?: string;
  /** tx hash of the resolver's resolve() */
  txResolve?: string;
}

export interface AttestationSummary {
  provider: string;
  success: boolean;
  teeVerifier: string; // "dstack"
  verifierURL: string; // open-source verifier release
  /** public, unauthenticated remote-attestation report URL */
  raReportURL: string;
  checks: {
    quoteValid: boolean;
    imageIntegrity: boolean;
    signerMatch: boolean;
  };
  /** trimmed preview of the TEE quote (first chars) for display */
  quotePreview: string;
  signerAddresses: string[];
  fetchedAt: number;
}
