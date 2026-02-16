// src/components/YBSLogo.js
import React from "react";
import config from "../config";

export default function YBSLogo({ size = 100 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      width={size}
      height={size}
    >
      {/* Outer circle */}
      <circle cx="100" cy="100" r="95" stroke="#D4C500" strokeWidth="8" fill="none" />
      {/* Inner circle */}
      <circle cx="100" cy="100" r="75" fill="#7B2E2E" />

      {/* House shape */}
      <polygon points="60,120 100,40 140,120" fill="#E6D21B" stroke="#7B2E2E" strokeWidth="3" />

      {/* Cross */}
      <rect x="97" y="70" width="6" height="30" fill="#7B2E2E" />
      <rect x="90" y="80" width="20" height="6" fill="#7B2E2E" />

      {/* Ribbon */}
      <path d="M70 125 Q100 145 130 125 L130 135 Q100 155 70 135 Z" fill="#E6D21B" stroke="#7B2E2E" strokeWidth="2" />
      <text x="100" y="145" fontSize="12" textAnchor="middle" fill="#7B2E2E" fontWeight="bold">{config.schoolInitials}</text>

      {/* Text around circle (approximation, static) */}
      <text x="100" y="15" fontSize="12" textAnchor="middle" fill="#7B2E2E" fontWeight="bold">{config.schoolName.toUpperCase()}</text>
      <text x="100" y="190" fontSize="10" textAnchor="middle" fill="#7B2E2E">{config.schoolMotto}</text>
    </svg>
  );
}
