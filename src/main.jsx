import React from "react";
import { createRoot } from "react-dom/client";
import DealScreen from "./DealScreen.jsx";
import EmailPreview from "./EmailPreview.jsx";
import "./styles.css";

// Two routes, no router dependency: "/" is the Deal Screen, "/email" is the follow-up email preview.
const path = window.location.pathname.replace(/\/+$/, "");
const Page = path === "/email" ? EmailPreview : DealScreen;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Page />
  </React.StrictMode>
);
