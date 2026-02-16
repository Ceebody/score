// src/components/BackButton.js
import React from "react";
import { useNavigate } from "react-router-dom";

export default function BackButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(-1)}
      className="
        fixed top-4 right-4 z-[9999]
        flex items-center gap-2
        bg-yellow-600 text-white
        px-4 py-2 rounded-md shadow-lg
        hover:bg-yellow-700 transition
        active:scale-95
      "
    >
      ← Back
    </button>
  );
}
