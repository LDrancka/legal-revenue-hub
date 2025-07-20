import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};