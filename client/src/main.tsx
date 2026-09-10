import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { appConfig } from "@/config/app-config";
import { AuthProvider } from "@/hooks/use-auth";
import { CartProvider } from "@/hooks/use-cart";
import { AppRouter } from "@/router";
import { installAnnotationBridge } from "@/lib/annotation-bridge";
import "./index.css";

// index.html ships the template's own title. The generated brand owns it at
// runtime, so a rebranded shop does not keep the template name in the tab.
document.title = appConfig.name;
installAnnotationBridge();

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element in index.html");

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        {/* Cart sits inside Auth: signing in merges the guest basket, so the
            cart must be able to react to the user changing. */}
        <AuthProvider>
          <CartProvider>
            <AppRouter />
            <Toaster richColors />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
