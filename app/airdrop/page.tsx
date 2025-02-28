"use client"

import { useEffect, useState, memo } from "react"
import { Connection, PublicKey, Transaction } from "@solana/web3.js"
import { Metaplex, walletAdapterIdentity } from "@metaplex-foundation/js"
import { useWallet } from "@solana/wallet-adapter-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAccount, createAssociatedTokenAccountInstruction } from '@solana/spl-token';

interface RecipientInfo {
    address: string
    count: number
}

const NFTBulkSender = memo(() => {
    const [recipientInfo, setRecipientInfo] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [nftInfos, setNftInfos] = useState<any[]>([])
    const [selectedNft, setSelectedNft] = useState<any>(null)

    const { showToast } = useToast()
    const wallet = useWallet()
    const connection = new Connection(`https://solana-devnet.rpc.extrnode.com/${process.env.NEXT_PUBLIC_EXTRNODE_API}`, 'confirmed')
    const metaplex = Metaplex.make(connection).use(walletAdapterIdentity(wallet))

    const parseRecipientInfo = (info: string): RecipientInfo[] => {
        return info
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line !== "")
            .map((line) => {
                const [address, countStr] = line.split(",").map((item) => item.trim())
                return {
                    address,
                    count: isNaN(parseInt(countStr, 10)) ? 1 : parseInt(countStr, 10),
                }
            })
    }

    useEffect(() => {
        const fetchNFTs = async () => {
            console.log("fetchNFTS")
            if (!wallet.connected || !wallet.publicKey) return
            try {
                const fetchedNfts = await metaplex.nfts().findAllByOwner({
                    owner: wallet.publicKey,
                })
                setNftInfos(fetchedNfts)
            } catch (error) {
                console.error("Error fetching NFTs:", error)
            }
        }
        fetchNFTs()
    }, [wallet.connected])

    const handleSelectNft = (mintAddress: string) => {
        const nft = nftInfos.find((nft: { mintAddress: PublicKey }) => nft.mintAddress.toBase58() === mintAddress)
        setSelectedNft(nft || null)
    }

    const sendSignedTransaction = async (
        connection: Connection,
        transaction: Transaction,
        wallet: any
    ) => {
        try {
            if (!wallet.publicKey) throw new Error('Wallet not connected.');

            // Sign the transaction with the wallet
            transaction.feePayer = wallet.publicKey;
            transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

            const signedTransaction = await wallet.signTransaction(transaction);

            // Send the transaction
            const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
            });

            // Confirm the transaction
            await connection.confirmTransaction(signature, 'confirmed');

            console.log('Transaction successful! Signature:', signature);
            return signature;
        } catch (error) {
            console.error('Transaction failed:', error);
            throw error;
        }
    };

    const sendNFTs = async () => {
        if (!wallet.connected || !wallet.publicKey) {
            showToast("Please connect your wallet", "error")
            return
        }

        if (!selectedNft || !recipientInfo) {
            showToast("Please select an NFT and enter recipient information", "error")
            return
        }

        setIsLoading(true)
        try {
            const recipients = parseRecipientInfo(recipientInfo)
            for (const { address, count } of recipients) {
                const recipientPublicKey = new PublicKey(address)
                const mintPublicKey = new PublicKey(selectedNft.mintAddress);

                // const senderTokenAccount = await getAssociatedTokenAddress(mintPublicKey, wallet.publicKey);
                // const recipientTokenAccount = await getAssociatedTokenAddress(mintPublicKey, recipientPublicKey);
                const senderTokenAccount = await getAssociatedTokenAddress(
                    mintPublicKey, wallet.publicKey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
                );

                const recipientTokenAccount = await getAssociatedTokenAddress(
                    mintPublicKey, recipientPublicKey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
                );

                // const transaction = new Transaction().add(
                //     createTransferInstruction(
                //     senderTokenAccount,
                //     recipientTokenAccount,
                //     wallet.publicKey,
                //     1 // NFTs are non-fungible, so always transferring 1
                //     )
                // );

                const transaction = new Transaction();

                // ✅ 1. Ensure the recipient's ATA exists
                try {
                    await getAccount(connection, recipientTokenAccount);
                } catch (error) {
                    console.log('Recipient ATA does not exist. Creating one...');
                    transaction.add(
                        createAssociatedTokenAccountInstruction(
                            wallet.publicKey, recipientTokenAccount, recipientPublicKey, mintPublicKey
                        )
                    );
                }

                // ✅ 2. Add transfer instruction
                transaction.add(
                    createTransferInstruction(
                        senderTokenAccount, recipientTokenAccount, wallet.publicKey, 1
                    )
                );

                // ✅ 3. Fetch the latest blockhash BEFORE signing
                const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = wallet.publicKey;

                const signature = await sendSignedTransaction(connection, transaction, wallet);
                console.log(`Transaction successful! Signature: ${signature}`);

                showToast("Success")
            }
        } catch (error) {
            console.error("❌ Transfer failed:", error)
            showToast("Transfer failed, check console for details", "error")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">NFT Bulk Sender</h1>
            <div className="space-y-4">
                <div>
                    <label htmlFor="nftSelect" className="block text-sm font-medium text-gray-700">
                        Select NFT
                    </label>
                    <select
                        id="nftSelect"
                        value={selectedNft?.mintAddress.toBase58() || ""}
                        onChange={(e) => handleSelectNft(e.target.value)}
                        className="border p-2 rounded w-full"
                    >
                        <option value="" disabled>Select an NFT</option>
                        {nftInfos.map((nft, index) => (
                            <option key={index} value={nft.mintAddress.toBase58()}>
                                {nft.name || "Unnamed NFT"}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="recipientInfo" className="block text-sm font-medium text-gray-700">
                        Recipient Information
                    </label>
                    <Textarea
                        id="recipientInfo"
                        value={recipientInfo}
                        onChange={(e) => setRecipientInfo(e.target.value)}
                        placeholder="Enter recipient addresses and counts (one per line, format: address, count)"
                        className="mt-1 w-full"
                        rows={5}
                    />
                </div>
                <Button onClick={sendNFTs} disabled={isLoading || !wallet.connected}>
                    {isLoading ? "Sending..." : "Send NFTs"}
                </Button>
            </div>
        </div>
    )
}
)

export default NFTBulkSender; 