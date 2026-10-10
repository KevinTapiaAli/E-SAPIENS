import type { Metadata } from "next";
import "./globals.css";

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
