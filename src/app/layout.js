import "./globals.css";
import { Toaster } from "react-hot-toast";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata = {
  title: "SARA-NPCA",
  description:
    "Sistema de Administração e Registro de Asteroides - Núcleo de Pesquisa e Caça de Asteroides",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <Nav />
        {children}
        <Footer />
        <Toaster position="top-left" reverseOrder={false} />
      </body>
    </html>
  );
}
