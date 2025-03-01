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
      <div className="w-[300px] mx-auto pt-24">
        <div className="flex flex-col gap-8 items-center justify-center bg-gradient-to-br p-4">
          <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6 w-80 text-center border border-gray-700 relative overflow-hidden">
            <Link
              href="/mint-NFT"><h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 relative">NFT発行</h2></Link>
          </div>
          <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6 w-80 text-center border border-gray-700 relative overflow-hidden">
            <Link
              href="/airdrop"><h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 relative">エアドロップ</h2></Link>
          </div>
        </div>
      </div>
    </motion.main>
  );
}
