"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function Home() {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-full sm:w-[80%] max-w-[940px] mx-auto pt-4 pb-12 sm:pt-24 sm:pb-24 px-4">
        <div className="flex flex-col gap-8 items-center justify-center bg-gradient-to-br p-4">
          <div className="w-full font-semibold">            
            <p>
              当サイトでは、Solanaチェーン上で簡単にNFTを発行し、特定のウォレットアドレスに一斉送付することができます。
            </p>
            <br />
            <p>🔹: 主な機能</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Solanaチェーン対応：高速・低コストでNFTを発行</li>
              <li>Phantomウォレット接続：シームレスな操作でNFTを管理</li>
              <li>
                一括エアドロップ：発行したNFTを指定した複数のアドレスに瞬時に送付
              </li>
            </ul>
            <br />
            <p>
              Web3時代のNFT発行・配布をより簡単に、効率的に。
              <br />
              今すぐPhantomウォレットを接続して、Solanaのエコシステムに参加しましょう！
            </p>
            <div className="flex justify-center align-center gap-4 sm:gap-20 flex-wrap mt-10 sm:mt-20">
            <Link
              href="/mint"
              className="w-fit min-w-[120px] sm:min-w-[140px] border border-solid border-black rounded-lg py-1.5 px-0 flex items-center justify-center h-[42px]"
            >
              NFT発行
            </Link>
            <Link
              href="/airdrop"
              className="w-fit min-w-[120px] sm:min-w-[140px] border border-solid border-black rounded-lg py-1.5 px-0 flex items-center justify-center h-[42px]"
            >
              エアドロップ
            </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.main>
  );
}
