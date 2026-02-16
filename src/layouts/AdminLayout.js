// src/layouts/AdminLayout.js
import { Outlet } from "react-router-dom";
import SideNav from "../components/SideNav";

const AdminLayout = () => {
  return (
    <div className="flex min-h-screen">
      <SideNav role="admin" />

      {/* Main Content */}
      <div className="flex-1 p-8">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
