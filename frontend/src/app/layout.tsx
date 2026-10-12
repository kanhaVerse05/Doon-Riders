import type { Metadata, Viewport } from "next";
import "./globals.css";
import GlobalOfflineBanner from "@/components/GlobalOfflineBanner";

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
    <html lang="en" className="overflow-x-hidden">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Kalam:wght@400;700&family=Manrope:wght@300;400;500;600;700;800&family=Play:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white text-[#101828] font-sans antialiased selection:bg-[#00D96B] selection:text-white overflow-x-hidden min-w-[320px]">
        <GlobalOfflineBanner />
        {children}
      </body>
    </html>
  );
}
