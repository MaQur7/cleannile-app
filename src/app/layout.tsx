import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../components/providers/AuthProvider";
import AppNavigation from "../components/navigation/AppNavigation";

export const metadata: Metadata = {
  title: "CleanNile",
  description: "Environmental reporting and community cleanup platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="app-body">
        <AuthProvider>
          <AppNavigation />
          <main className="app-main">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
