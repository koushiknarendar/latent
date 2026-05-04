import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Latent — The connection was already there.",
  description: "Find interesting people within 500 metres. Anonymous until you're ready.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.className} antialiased bg-black text-white min-h-screen`}>
        {children}
        <Toaster position="top-center" theme="dark" />
      </body>
    </html>
  );
}
