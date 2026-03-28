import { useState } from "react";
import * as StellarSdk from "@stellar/stellar-sdk";
import freighter from "@stellar/freighter-api";
import { useWallet } from "../../context/useWallet";
import type { PendingTransaction } from "./types";

interface PendingTransactionCardProps {
  transaction: PendingTransaction;
  onSign: (txId: string, publicKey: string) => void;
  onExecute: (txId: string) => void;
}

const RPC_URL =
  import.meta.env.VITE_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  import.meta.env.VITE_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015";

export default function PendingTransactionCard({
  transaction,
  onSign,
  onExecute,
}: PendingTransactionCardProps) {
  const { walletAddress } = useWallet();
  const [signing, setSigning] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSigned = transaction.signatures.some(
    (s) => s.publicKey === walletAddress,
  );
  const isReady = transaction.signatures.length >= transaction.threshold;
  const isExecuted = transaction.status === "executed";

  async function handleSign() {
    if (!walletAddress) return;
    setSigning(true);
    setError(null);

    try {
      const signed = await freighter.signTransaction(transaction.xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      if (!signed?.signedTxXdr) {
        throw new Error("Signing was rejected by wallet");
      }

      onSign(transaction.id, walletAddress);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSigning(false);
    }
  }

  async function handleExecute() {
    if (!isReady) return;
    setExecuting(true);
    setError(null);

    try {
      const server = new StellarSdk.rpc.Server(RPC_URL);
      const tx = StellarSdk.TransactionBuilder.fromXDR(
        transaction.xdr,
        NETWORK_PASSPHRASE,
      );

      const sendResponse = await server.sendTransaction(tx);

      if (sendResponse.status === "ERROR") {
        throw new Error(
          `Submission rejected: ${sendResponse.errorResult?.toXDR("base64") ?? "unknown"}`,
        );
      }

      const hash = sendResponse.hash;
      const deadline = Date.now() + 30_000;
      let result = await server.getTransaction(hash);

      while (
        result.status === StellarSdk.rpc.Api.GetTransactionStatus.NOT_FOUND &&
        Date.now() < deadline
      ) {
        await new Promise((r) => setTimeout(r, 2000));
        result = await server.getTransaction(hash);
      }

      if (result.status === StellarSdk.rpc.Api.GetTransactionStatus.SUCCESS) {
        onExecute(transaction.id);
      } else {
        throw new Error(`Transaction ${result.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExecuting(false);
    }
  }

  const statusColor = isExecuted
    ? "text-green-400"
    : isReady
      ? "text-yellow-400"
      : "text-gray-400";

  const statusLabel = isExecuted
    ? "Executed"
    : isReady
      ? "Ready to Execute"
      : `${transaction.signatures.length}/${transaction.threshold} signatures`;

  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-white">{transaction.description}</p>
          <p className="text-xs text-gray-500 mt-1">
            Method: {transaction.method} | Created:{" "}
            {new Date(transaction.createdAt).toLocaleString()}
          </p>
        </div>
        <span className={`text-sm font-medium ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {transaction.signatures.map((sig) => (
          <span
            key={sig.publicKey}
            className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded"
          >
            {sig.publicKey.slice(0, 8)}...{sig.publicKey.slice(-4)}
          </span>
        ))}
      </div>

      <div className="bg-[#1a1a2e] rounded p-3 overflow-x-auto">
        <p className="text-xs text-gray-500 mb-1">Transaction XDR</p>
        <p className="text-xs text-gray-300 font-mono break-all">
          {transaction.xdr.slice(0, 120)}...
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {!isExecuted && (
        <div className="flex gap-3">
          {!hasSigned && (
            <button
              onClick={handleSign}
              disabled={signing || !walletAddress}
              className="flex-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold py-2 rounded-lg hover:bg-indigo-500/30 disabled:opacity-50 transition-all"
            >
              {signing ? "Signing..." : "Sign Transaction"}
            </button>
          )}
          {isReady && (
            <button
              onClick={handleExecute}
              disabled={executing}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-2 rounded-lg disabled:opacity-50 transition-opacity"
            >
              {executing ? "Executing..." : "Execute"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
