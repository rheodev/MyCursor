import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { UsageProvider } from "./context/UsageContext";
import { ThemeProvider } from "./context/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <UsageProvider>
          <App />
        </UsageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
