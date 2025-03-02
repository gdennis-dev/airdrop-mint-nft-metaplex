"use client";

import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@solana/wallet-adapter-react"
import { Metaplex, TransactionBuilder, walletAdapterIdentity } from '@metaplex-foundation/js';
import { Connection, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js"
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import axios from 'axios';

function NFTCreator() {
  const [nftName, setNftName] = useState("");
  const [nftSymbol, setNftSymbol] = useState("");
  const [nftNumber, setNftNumber] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [attributes, setAttributes] = useState([{ trait_type: "", value: "" }]);
  const [isLoading, setIsLoading] = useState(false)

  const { showToast } = useToast()
  const wallet = useWallet()

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleAttributesChange = (index: number, field: "trait_type" | "value", value: string) => {
    const newAttributes = [...attributes];
    newAttributes[index] = { ...newAttributes[index], [field]: value };
    setAttributes(newAttributes);
  };

  const addAttribute = (e: React.FormEvent) => {
    e.preventDefault();
    setAttributes([...attributes, { trait_type: "", value: "" }]);
  };

  const removeAttribute = (index: number) => {
    if (attributes.length > 1) {
      setAttributes(attributes.filter((_, i) => i !== index));
    }
  };

  const uploadImageToPinata = async (imageFile: File, description: string, attributes: { trait_type: string; value: string }[]): Promise<string> => {
    const formData = new FormData();
    formData.append('file', imageFile);

    const pinataMetadata = JSON.stringify({
      name: nftName,
    });
    formData.append('pinataMetadata', pinataMetadata);

    const pinataOptions = JSON.stringify({
      cidVersion: 0,
    });
    formData.append('pinataOptions', pinataOptions);

    try {
      const imageRes = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
        maxBodyLength: Infinity,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_JWT}`,
        },
      });
      const imageUrl = `https://gateway.pinata.cloud/ipfs/${imageRes.data.IpfsHash}`;

      const metadata = {
        name: imageFile.name,
        description,
        image: imageUrl,
        attributes,
      };

      const metadataRes = await axios.post(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        metadata,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_JWT}`,
          },
        }
      );

      // Return Metadata IPFS URL
      return `https://gateway.pinata.cloud/ipfs/${metadataRes.data.IpfsHash}`;

    } catch (error) {
      // console.error('Error uploading to Pinata:', error);
      throw error;
    }
  };


  const mintNFT = async () => {
    if (!wallet.connected || !imageFile) {
      showToast("ウォレットを接続し、画像をアップロードしてください。", "error")
      return
    }

    setIsLoading(true)

    try {
      const connection = new Connection(`https://solana-devnet.rpc.extrnode.com/${process.env.NEXT_PUBLIC_EXTRNODE_API}`)
      const metaplex = Metaplex.make(connection).use(walletAdapterIdentity(wallet))
      const payer = wallet.publicKey;

      const balance = await connection.getBalance(payer!);
      const requiredLamports = 0.001 * LAMPORTS_PER_SOL; // Convert 0.001 SOL to lamports
      if (balance < requiredLamports) {
        showToast("バランス不足！少なくとも0.0001 SOLが必要。", "error");
        throw new Error("Insufficient SOL balance.");
      }

      // Upload the image
      const imageUri = await uploadImageToPinata(imageFile, description, attributes);
      // Create the NFT
      const nftBuilder = await metaplex.nfts().builders().create({
        name: nftName,
        uri: imageUri,
        symbol: nftSymbol,
        sellerFeeBasisPoints: 500,
        updateAuthority: metaplex.identity(),
        mintAuthority: metaplex.identity(),
      })

      const solTransfer = SystemProgram.transfer({
        fromPubkey: payer!,
        toPubkey: new PublicKey(`${process.env.NEXT_PUBLIC_ADMIN_WALLET}`),
        lamports: requiredLamports,
      });

      const transactionBuilder = TransactionBuilder.make()
        .add(nftBuilder) // NFT Minting
        .add({ instruction: solTransfer, signers: [metaplex.identity()] });
      const { response } = await transactionBuilder.sendAndConfirm(metaplex);
      showToast(`NFTに住所が発行されました。: ${response.signature}`, "success")

    } catch (error) {
      // console.error("Error minting NFT:", error)
      showToast("NFT発行にエラーが発生しました。もう一度やり直してください。", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await mintNFT()
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container px-4 py-8 mx-auto rounded-lg bg-[#fff] backdrop-blur-sm "
    >
      <h1 className="mb-4 text-3xl font-bold text-black">NFT発行</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="nftName">NFT名</Label>
          <Input
            id="nftName"
            value={nftName}
            onChange={(e) => setNftName(e.target.value)}
            placeholder="NFT名を入力してください"
            className="mt-1"
            required
          />
        </div>
        <div>
          <Label htmlFor="nftSymbol">シンボル</Label>
          <Input
            id="nftSymbol"
            value={nftSymbol}
            onChange={(e) => setNftSymbol(e.target.value)}
            placeholder="シンボルを入力してください"
            className="mt-1"
            maxLength={10}
            required
          />
        </div>
        <div>
          <Label htmlFor="description">説明</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="NFTについて説明してください。"
            className="mt-1"
            required
          />
        </div>
        <div>
          <Label htmlFor="imageUpload">画像</Label>
          <Input
            id="imageUpload"
            type="file"
            onChange={handleImageUpload}
            accept="image/*"
            className="mt-1"
            required
          />
        </div>
        {/* <div>
          <Label htmlFor="nftNumber">Number of NFTs</Label>
          <Input
            id="nftNumber"
            type="number"
            value={nftNumber}
            onChange={(e) => setNftNumber(e.target.value ? Number(e.target.value) : "")}
            placeholder="Enter Number"
            className="mt-1 w-40"
          />
        </div> */}
        <div>
          <Label htmlFor="attributes">属性</Label>
          {attributes.map((attr, index) => (
            <div key={index} className="flex gap-2 mb-3">
              {/* Trait Type Input */}
              <Input
                type="text"
                value={attr.trait_type}
                onChange={(e) => handleAttributesChange(index, "trait_type", e.target.value)}
                placeholder="特性タイプ"
                className="w-80 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              />

              {/* Value Input */}
              <Input
                type="text"
                value={attr.value}
                onChange={(e) => handleAttributesChange(index, "value", e.target.value)}
                placeholder="価値"
                className="w-80 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              />

              {/* Remove Button (Only if there's more than one input) */}
              {attributes.length > 1 && (
                <button
                  onClick={() => removeAttribute(index)}
                  className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <Button
            onClick={addAttribute}
            className="w-40 px-4 py-2 bg-[#000] text-white rounded hover:bg-[#ccc] mt-3 font-bold"
          >
            + 属性追加
          </Button>
        </div>


        <Button className="mt-4 text-white hover:bg-[#ccc] bg-[#000] font-bold" type="submit" disabled={isLoading || !wallet.connected}>
          {isLoading ? "NFT発行中..." : "NFT発行"}
        </Button>
      </form>

    </motion.div >
  );
}

NFTCreator.displayName = "NFTCreator";

export default NFTCreator;