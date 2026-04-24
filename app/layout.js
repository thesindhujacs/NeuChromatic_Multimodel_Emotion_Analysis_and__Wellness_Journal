import "./globals.css";

export const metadata = {
  title: "NeuChromatic",
  description: "Understand your emotions through art, color and words",
  manifest: "/manifest.json",
  themeColor: "#7C3AED",
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

