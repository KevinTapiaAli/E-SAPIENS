import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const inter = localFont({
  src: "../shared/fonts/Inter.ttf",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
});
const montserrat = localFont({
  src: "../shared/fonts/Montserrat.ttf",
  variable: "--font-montserrat",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "E-SAPIENS",
    template: "%s | E-SAPIENS",
  },
  description: "Plataforma de aprendizaje y formación en línea E-SAPIENS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${montserrat.variable}`}
      data-scroll-behavior="smooth"
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.theme=localStorage.getItem('esapiens-theme')==='dark'?'dark':'light'}catch{}`,
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        <a href="#main-content" className="skip-link">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
