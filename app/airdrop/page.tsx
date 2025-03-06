"use client";

import { useEffect, useState } from "react";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { Metaplex, walletAdapterIdentity } from "@metaplex-foundation/js";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";

interface RecipientInfo {
  address: string;
  count: number;
}

interface ProcessedData {
  name: string;
  uri: string;
  numbers: number;
}

export default function NFTBulkSender() {
  const [recipientInfo, setRecipientInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [nftInfos, setNftInfos] = useState<any[]>([]);
  const [selectedNfts, setSelectedNfts] = useState<any[]>([]);
  const [selectData, setSelectData] = useState<ProcessedData[]>([]);
  const [selectedData, setSelectedData] = useState<ProcessedData | null>(null);

  const { showToast } = useToast();
  const wallet = useWallet();
  const connection = new Connection(
    `https://solana-devnet.rpc.extrnode.com/${process.env.NEXT_PUBLIC_EXTRNODE_API}`,
    "confirmed"
  );
  const metaplex = Metaplex.make(connection).use(walletAdapterIdentity(wallet));

  const parseRecipientInfo = (info: string): RecipientInfo[] => {
    return info
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .map((line) => {
        const [address, countStr] = line.split(",").map((item) => item.trim());
        return {
          address,
          count: isNaN(parseInt(countStr, 10)) ? 1 : parseInt(countStr, 10),
        };
      });
  };

  useEffect(() => {
    const fetchNFTs = async () => {
      if (!wallet.connected || !wallet.publicKey) return;
      try {
        const fetchedNfts = await metaplex.nfts().findAllByOwner({
          owner: wallet.publicKey,
        });
        setNftInfos(fetchedNfts);
        setSelectData(countNFTsByURI(fetchedNfts));
      } catch (error) {
        // console.error("Error fetching NFTs:", error)
      }
    };
    fetchNFTs();
  }, [wallet.connected]);

  const handleSelectNft = (uri: string) => {
    const nfts = nftInfos.filter((nft: { uri: string }) => nft.uri === uri);
    const data = selectData.find((nft: { uri: string }) => nft.uri === uri);
    console.log(nfts);
    setSelectedNfts(nfts || []);
    setSelectedData(data || null);
  };

  const sendSignedTransaction = async (
    connection: Connection,
    transaction: Transaction,
    wallet: any
  ) => {
    try {
      if (!wallet.publicKey) throw new Error("Wallet not connected.");

      // Sign the transaction with the wallet
      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;

      const signedTransaction = await wallet.signTransaction(transaction);

      // Send the transaction
      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        }
      );

      // Confirm the transaction
      await connection.confirmTransaction(signature, "confirmed");

      // console.log('Transaction successful! Signature:', signature);
      return signature;
    } catch (error) {
      // console.error('Transaction failed:', error);
      throw error;
    }
  };

  const countNFTsByURI = (nftData: any[]): ProcessedData[] => {
    const uriCountMap = new Map<string, { name: string; count: number }>();

    // Count occurrences of each unique URI
    nftData.forEach((item) => {
      if (uriCountMap.has(item.uri)) {
        // Increment count if URI exists
        uriCountMap.get(item.uri)!.count += 1;
      } else {
        // Initialize entry with count = 1
        uriCountMap.set(item.uri, { name: item.name, count: 1 });
      }
    });

    // Convert the map to an array of objects
    return Array.from(uriCountMap.entries()).map(([uri, data]) => ({
      name: data.name,
      uri: uri,
      numbers: data.count,
    }));
  };

  const sendNFTs = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      showToast("ウォレットを接続してください。", "error");
      return;
    }

    if (!selectedNfts || !recipientInfo) {
      showToast("NFTを選択し、受取人情報を入力してください。", "error");
      return;
    }

    const recipients = parseRecipientInfo(recipientInfo);
    const totalCount = recipients.reduce(
      (sum, recipient) => sum + recipient.count,
      0
    );
    if (totalCount > selectedData?.numbers!) {
      showToast(
        "NFTの上限を超えています。再度ご確認をお願いいたします。",
        "error"
      );
      return;
    }
    setIsLoading(true);

    try {
      let nftIndex = 0; // Track which NFT we're sending

      for (const { address, count } of recipients) {
        const recipientPublicKey = new PublicKey(address);

        // Slice out 'count' number of NFTs for this recipient
        const nftsToSend = selectedNfts.slice(nftIndex, nftIndex + count);
        nftIndex += count; // Move index forward

        for (const nft of nftsToSend) {
          const mintPublicKey = new PublicKey(nft.mintAddress);
          const requiredLamports = 0.001 * LAMPORTS_PER_SOL; // Convert 0.001 SOL to lamports

          const senderTokenAccount = await getAssociatedTokenAddress(
            mintPublicKey,
            wallet.publicKey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          );

          const recipientTokenAccount = await getAssociatedTokenAddress(
            mintPublicKey,
            recipientPublicKey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          );

          const solTransfer = SystemProgram.transfer({
            fromPubkey: wallet.publicKey!,
            toPubkey: new PublicKey(`${process.env.NEXT_PUBLIC_ADMIN_WALLET}`),
            lamports: requiredLamports,
          });

          const transaction = new Transaction();

          try {
            await getAccount(connection, recipientTokenAccount);
          } catch (error) {
            transaction.add(
              createAssociatedTokenAccountInstruction(
                wallet.publicKey,
                recipientTokenAccount,
                recipientPublicKey,
                mintPublicKey
              )
            );
          }

          transaction.add(
            createTransferInstruction(
              senderTokenAccount,
              recipientTokenAccount,
              wallet.publicKey,
              1
            )
          );

          transaction.add(solTransfer);

          const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = wallet.publicKey;

          const signature = await sendSignedTransaction(
            connection,
            transaction,
            wallet
          );

          showToast(`送信成功: ${signature}`, "success");
        }
      }
    } catch (error) {
      showToast("転送に失敗しました。", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container px-4 py-8 mx-auto bg-[#fff] backdrop-blur-sm "
    >
      <h1 className="mb-4 text-xl sm:text-2xl font-bold text-black">エアドロップ</h1>
      <div className="space-y-4">
        <div>
          <Label htmlFor="nftSelect">NFT選択</Label>
          <select
            id="nftSelect"
            value={selectedData?.uri || ""}
            onChange={(e) => handleSelectNft(e.target.value)}
            className="border p-2 rounded w-full bg-[#fff] border-[#000]"
          >
            <option value="" disabled>
              NFTを選択してください
            </option>
            {selectData.map((nft, index) => (
              <option key={index} value={nft.uri}>
                {nft.name || "Unnamed NFT"} ({nft.numbers || 0}数)
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="recipientInfo">受取人情報</Label>
          <Textarea
            id="recipientInfo"
            value={recipientInfo}
            onChange={(e) => setRecipientInfo(e.target.value)}
            placeholder="受取人のSolアドレスと、送る数量を入力（1行ごとにアドレス, 数量で記載してください）"
            className="mt-1 w-full"
            rows={5}
          />
        </div>
        <Button
          className="mt-4 text-white hover:bg-[#ccc] bg-[#000] font-bold"
          onClick={sendNFTs}
          disabled={isLoading || !wallet.connected}
        >
          {isLoading ? "送信中..." : "NFT送信"}
        </Button>
      </div>
    </motion.div>
  );
}
