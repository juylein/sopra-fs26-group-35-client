"use client"; 

import React, { useEffect, useState } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { Button, Card, Table } from "antd";
import type { TableProps } from "antd";
import { LayoutDashboard, BookOpen, Clock, Search, HelpCircle, Users, Share2, Rows,} from "lucide-react"; //for navigation buttons 
import { RotatingLines } from "react-loader-spinner";
import { toast, ToastContainer  } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

  const Dashboard: React.FC = () => {
    const router = useRouter();
    const apiService = useApi();
    const params = useParams();
    const userId = params.id;
    const pathname = usePathname();
    const textSize = "1.2rem";
    const [loadingPath, setLoadingPath] = useState <string | null>(null);
    const [dashboardData, setDashboardData] = useState <any>(null);
    const [loadingData, setLoadingData] = useState<boolean>(false);

//Navigation Bar 
    const menu = [
      { name: "Dashboard", icon: LayoutDashboard, path: "/users/${userId}" },
      { name: "Library", icon: BookOpen, path: "/library" },
      { name: "Reading Session", icon: Clock, path: "/reading" },
      { name: "Discover", icon: Search, path: "/discover" },
      { name: "Quiz", icon: HelpCircle, path: "/quiz" },
      { name: "Friends", icon: Users, path: "/friends" },
      { name: "Shared Reading Session", icon: Share2, path: "/shared" },
    ];

const handleClick = (path: string) => {
  if (pathname === path){
    return;
  }
    try{
        setLoadingPath(path);
        router.push(path);
    }
    catch(error){
        toast.error("Something went wrong", {
            position: "top-center",
            autoClose: 3000,
          });
    }
  
}

useEffect(() => {
  const fetchData = async () => {
    setLoadingData(true)
    try{
      const data = await apiService.get("/dashboard");
      setDashboardData(data);
    }
    catch(error){
      toast.error("Failed to load data");
    }
    finally{
      setLoadingData(false);
    }
  }
  fetchData()
},[apiService]) ;

return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h1 className="logo-title">
          <span className="logo-book">Book</span>
          <span className="logo-shelf">shelf</span>
        </h1>

        <div className="menu">
          {menu.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                onClick={() => handleClick(item.path)}
                className="icon"
              >
                <Icon size={30} />
                <span style={{ fontSize: textSize }}>{item.name}</span>
              </div>
            );
          })}
        </div>
        </div>

      <div className="loading-container">
        {loadingPath && (
          <RotatingLines
            strokeColor="black"
            strokeWidth="10"
            animationDuration="0.6"
            width="50"
            visible={true}
          />
        )}
      </div>
      <ToastContainer 
       toastClassName="custom-toast">
       </ToastContainer>
    </div>
  );
};

export default Dashboard;