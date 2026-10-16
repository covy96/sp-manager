import { createPortal } from "react-dom";

// Rende i figli direttamente in <body>. Serve ai modali dei pannelli (Capex,
// Documenti, Pratiche…): se il pulsante sta dentro un contenitore che scorre
// o con backdrop-filter/transform, un position:fixed resterebbe "intrappolato"
// lì dentro e su mobile finirebbe sotto o tagliato.
export default function BodyPortal({ children }) {
  if (typeof document === "undefined") return children;
  return createPortal(children, document.body);
}
