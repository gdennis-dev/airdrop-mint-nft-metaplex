"use client";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { CustomWalletMultiButton } from "./CustomWalletMultiButton";

type Props = {};

const Header = (props: Props) => {
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  return (
    <header className="w-full gap-8 px-4 py-4 sm:py-10 font-monsterr here">
      <div className=" sticky top-0 z-10 flex items-center justify-between lg:w-full">
        <Link href="/">
          <img src="./../logo.png" alt="ソラナ" className="logo sm:ml-6" />
        </Link>
        <div className="flex items-center justify-center flex-grow-0 gap-[2px] sm:gap-4 sm:mr-6">
          <nav className="hidden gap-4 lg:flex">
            <Link
              href="/"
              className="duration-500 cursor-pointer font-semibold delay-600 animate-in fade-in zoom-in hover:text-tealClr"
            >
              ホーム
            </Link>
            <Link
              href="/mint"
              className="duration-500 cursor-pointer font-semibold delay-600 animate-in fade-in zoom-in hover:text-tealClr"
            >
              NFT発行
            </Link>
            <Link
              href="/airdrop"
              className="duration-500 cursor-pointer font-semibold delay-600 animate-in fade-in zoom-in hover:text-tealClr"
            >
              エアドロップ
            </Link>
          </nav>
          <CustomWalletMultiButton className="bg-black" />

          <Sheet open={showSidebar} onOpenChange={setShowSidebar}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu size={30} />
              </Button>
            </SheetTrigger>

            <SheetContent className="w-[400px] sm:w-[540px]">
              <nav className="flex flex-col gap-4 text-[1.5em] mt-8">
                <Link
                  onClick={() => setShowSidebar(false)}
                  className="SidebarLink"
                  href="/"
                >
                  <div className="text-[0.8em] ">ホーム</div>
                </Link>
                <Link
                  onClick={() => setShowSidebar(false)}
                  className="SidebarLink"
                  href="/mint"
                >
                  <div className="text-[0.8em]">NFT発行</div>
                </Link>
                <Link
                  onClick={() => setShowSidebar(false)}
                  className="SidebarLink"
                  href="/airdrop"
                >
                  <div className="text-[0.8em]">エアドロップ</div>
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
