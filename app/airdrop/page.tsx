"use client";

import { useEffect, useState } from "react";

import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";

import { publicKey } from "@metaplex-foundation/umi";
import { dasApi } from "@metaplex-foundation/digital-asset-standard-api";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import {
  getAssetWithProof,
  mplBubblegum,
  transfer,
} from "@metaplex-foundation/mpl-bubblegum";

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
  const [refreshCounter, setRefreshCounter] = useState(0);

  const { showToast } = useToast();
  const wallet = useWallet();
  const umi = createUmi(
    `https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API}`
  );
  umi.use(walletAdapterIdentity(wallet));
  umi.use(dasApi());
  umi.use(mplBubblegum());

  const fetchCNFT = async () => {
    // Ensure wallet is connected and publicKey is available
    if (!wallet.publicKey || !wallet.connected) {
      console.error("Wallet is not connected");
      showToast("ウォレットを接続してください。", "error");
      return;
    }
    try {
      const assetsByOwner = await (umi.rpc as any).getAssetsByOwner({
        owner: umi.identity.publicKey, // Correct public key format
      });
      setNftInfos(assetsByOwner.items);
      setSelectData(countNFTsByURI(assetsByOwner.items));
    } catch (error) {
      console.error("Error fetching assets by owner:", error);
    }
  };

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

  const countNFTsByURI = (nftData: any[]): ProcessedData[] => {
    const uriCountMap = new Map<string, { name: string; count: number }>();

    nftData.forEach((item) => {
      if (uriCountMap.has(item.content.json_uri)) {
        uriCountMap.get(item.content.json_uri)!.count += 1;
      } else {
        uriCountMap.set(item.content.json_uri, {
          name: item.content.metadata.name,
          count: 1,
        });
      }
    });

    // Convert the map to an array of objects
    return Array.from(uriCountMap.entries()).map(([uri, data]) => ({
      name: data.name,
      uri: uri,
      numbers: data.count,
    }));
  };

  useEffect(() => {
    if (wallet.connected) {
      fetchCNFT(); // Fetch CNFTs when wallet is connected
    }
  }, [wallet, refreshCounter]);

  const handleSelectNft = (uri: string) => {
    const nfts = nftInfos.filter((item) => item.content.json_uri === uri);
    const data = selectData.find((nft: { uri: string }) => nft.uri === uri);
    setSelectedNfts(nfts || []);
    setSelectedData(data || null);
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
      (sum, recipient) => sum + Number(recipient.count),
      0
    );
    if (totalCount > Number(selectedData?.numbers!)) {
      showToast(
        "NFTの上限を超えています。再度ご確認をお願いいたします。",
        "error"
      );
      return;
    }
    setIsLoading(true);
    try {
      let nftIndex = 0;
      for (const { address, count } of recipients) {
        const recipientPublicKey = publicKey(address);
        const nftsToSend = selectedNfts.slice(nftIndex, nftIndex + count);
        nftIndex += count;
        for (const nft of nftsToSend) {
          const assetWithProof = await getAssetWithProof(umi as any, nft.id, {
            truncateCanopy: true,
          });
          await transfer(umi, {
            ...assetWithProof,
            leafOwner: umi.identity.publicKey,
            newLeafOwner: recipientPublicKey,
          }).sendAndConfirm(umi);
          showToast(`送信成功`, "success");
          setRefreshCounter((prev) => prev + 1);
        }
        setTimeout(() => {
          if (selectedData?.uri) {
            handleSelectNft(selectedData.uri);
          }
        }, 2000);
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
      <h1 className="mb-4 text-xl sm:text-2xl font-bold text-black">
        エアドロップ
      </h1>
      <div className="space-y-4">
        <div>
          <Label htmlFor="nftSelect">NFT選択</Label>
          <select
            id="nftSelect"
            value={selectedData?.uri || ""}
            onChange={(e) => handleSelectNft(e.target.value)}
            className="border p-2 rounded w-full bg-[#fff] border-[#000] focus:border-none focus:ring-2 focus:ring-blue-400"
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
            className="mt-1 w-full focus:border-none focus:ring-2 focus:ring-blue-400"
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
