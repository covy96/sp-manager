import { Navigate } from "react-router-dom";

// Pagina legacy — reindirizza al nuovo wizard di creazione studio
export default function RegisterPage() {
  return <Navigate to="/crea-studio" replace />;
}
