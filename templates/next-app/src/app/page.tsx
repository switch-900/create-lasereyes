"use client";
import { useLaserEyes, LaserEyesLogo } from "@omnisat/lasereyes";
import ConnectWallet from "@/components/ConnectWallet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState, useEffect } from "react";

export default function Home() {
  const { address } = useLaserEyes();

  const [isMounted, setIsMounted] = useState<boolean>(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) return null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-12 p-8 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:to-black text-black dark:text-white">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="flex flex-col items-center gap-8">
        <LaserEyesLogo color={address ? "green" : "orange"} />
        <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-orange-500 to-yellow-500 text-transparent bg-clip-text">
          {address
            ? "Welcome To Create LaserEyes."
            : "Welcome To The New Way Of Building."}
        </h1>
      </div>
      <div className="flex flex-col items-center gap-6">
        <ConnectWallet />
        {address && (
          <div className="flex flex-col gap-2">
            <p className="text-lg text-center text-black dark:text-gray-300">
              Connected Address:{" "}
              <span className="font-mono text-orange-400">{address}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
