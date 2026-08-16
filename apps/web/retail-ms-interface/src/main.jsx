import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { useAppStore } from "./store/appStore.js";

// Apply the saved/system theme before React paints to avoid a light-mode flash.
document.documentElement.dataset.theme = useAppStore.getState().theme;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
