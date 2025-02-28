"use client";

import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@solana/wallet-adapter-react"
import { Metaplex, walletAdapterIdentity, MetaplexFile, toMetaplexFileFromBrowser } from '@metaplex-foundation/js';
import { Connection } from "@solana/web3.js"
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
  const [attributes, setAttributes] = useState("");
  const [isLoading, setIsLoading] = useState(false)

  const { showToast } = useToast()
  const wallet = useWallet()

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const uploadImageToPinata = async (imageFile: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', imageFile);

    const pinataMetadata = JSON.stringify({
      name: imageFile.name,
    });
    formData.append('pinataMetadata', pinataMetadata);

    const pinataOptions = JSON.stringify({
      cidVersion: 0,
    });
    formData.append('pinataOptions', pinataOptions);

    try {
      const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
        maxBodyLength: Infinity,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_JWT}`,
        },
      });
      return `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`;
    } catch (error) {
      console.error('Error uploading to Pinata:', error);
      throw error;
    }
  };

  const mintNFT = async () => {
    if (!wallet.connected || !imageFile) {
      showToast("Please connect your wallet and upload an image.", "error")
      return
    }

    setIsLoading(true)

    try {
      const connection = new Connection(`https://solana-devnet.rpc.extrnode.com/${process.env.NEXT_PUBLIC_EXTRNODE_API}`)
      const metaplex = Metaplex.make(connection).use(walletAdapterIdentity(wallet))
      const file: MetaplexFile = await toMetaplexFileFromBrowser(imageFile)
      console.log(file)
      // Upload the image
      const imageUri = await uploadImageToPinata(imageFile);

      // Create the NFT
      const { nft } = await metaplex.nfts().create({
        name: nftName,
        uri: imageUri,
        symbol: nftSymbol,
        sellerFeeBasisPoints: 500,
        isCollection: false,
        mintAuthority: metaplex.identity(),
      }, { commitment: "finalized" })

      showToast(`Your NFT has been minted with address: ${nft.address.toString()}`, "success")
    } catch (error) {
      console.error("Error minting NFT:", error)
      showToast("There was an error minting your NFT. Please try again.", "error")
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
      className="container px-4 py-8 mx-auto bg-opacity-50 border rounded-lg bg-slate-800 backdrop-blur-sm border-teal-400/20"
    >
      <h1 className="mb-4 text-3xl font-bold text-teal-400">Mint NFT</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="nftName">Name</Label>
          <Input
            id="nftName"
            value={nftName}
            onChange={(e) => setNftName(e.target.value)}
            placeholder="Enter NFT name"
            className="mt-1"
            required
          />
        </div>
        <div>
          <Label htmlFor="nftSymbol">Symbol</Label>
          <Input
            id="nftSymbol"
            value={nftSymbol}
            onChange={(e) => setNftSymbol(e.target.value)}
            placeholder="Enter Symbol"
            className="mt-1"
            required
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your NFT"
            className="mt-1"
            required
          />
        </div>
        <div>
          <Label htmlFor="imageUpload">Image</Label>
          <Input
            id="imageUpload"
            type="file"
            onChange={handleImageUpload}
            accept="image/*"
            className="mt-1"
            required
          />
        </div>
        <div>
          <Label htmlFor="nftNumber">Number of NFTs</Label>
          <Input
            id="nftNumber"
            type="number"
            value={nftNumber}
            onChange={(e) => setNftNumber(e.target.value ? Number(e.target.value) : "")}
            placeholder="Enter Number"
            className="mt-1 w-40"
          />
        </div>
        <div>
          <Label htmlFor="attributes">Attributes</Label>
          <Input
            id="attributes"
            value={attributes}
            onChange={(e) => setAttributes(e.target.value)}
            placeholder="Enter Attrebutes"
            className="mt-1"
          />
        </div>


        <Button className="mt-4 bg-teal-400 hover:bg-teal-600" type="submit">
          {isLoading ? "Minting NFT..." : "Mint NFT"}
        </Button>
      </form>

    </motion.div>
  );
}

NFTCreator.displayName = "NFTCreator";

export default NFTCreator;
