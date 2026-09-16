"use client"
import React from "react";
import Link from "next/link";

const Footer = () => {
  return (
    <footer>
      <p>
        SARA-NPCA &copy; 2026. Todos os direitos reservados.{" "}
        <Link
          href="https://sites.google.com/view/npca-brasil"
          target="_blank"
          rel="noopener noreferrer"
        >
          <b>Website do NPCA</b>
        </Link>
      </p>
    </footer>
  );
};

export default Footer;
