import type { Metadata, Viewport } from "next";
import { Play, Manrope, Inter, Kalam } from "next/font/google";
import "./globals.css";

const play = Play({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-play",
});

const manrope = Manrope({
  weight: ["300", "400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-manrope",
});

const inter = Inter({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-inter",
});

const kalam = Kalam({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-kalam",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#00D96B",
};

export const metadata: Metadata = {
  title: "DOON Riders - Best EV Rental Scooty in Uttarakhand",
  description: "Rent an electric scooter in Dehradun from ₹1,699/week with unlimited battery swaps, zero fuel costs, and no licence required.",
  icons: {
    icon: "/images/doon-riders-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${play.variable} ${manrope.variable} ${inter.variable} ${kalam.variable} overflow-x-hidden`}
    >
      <body className="bg-white text-[#101828] font-sans antialiased selection:bg-[#00D96B] selection:text-white overflow-x-hidden min-w-[320px]">
        {children}
      </body>
    </html>
  );
}
