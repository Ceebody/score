import React from "react";
import SideNav from "../components/SideNav";
import { Outlet } from "react-router-dom";

export default function StudentLayout() {
  return (
    <div className="flex min-h-screen">
      <SideNav role="student" />
      <div className="flex-1 p-6">
        <Outlet />
      </div>
    </div>
  );
}
