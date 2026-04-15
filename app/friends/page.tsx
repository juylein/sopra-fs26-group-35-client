"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import Sidebar from "@/components/sidebar";
import { Button } from "antd";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { useHandleErrorMessage } from "@/hooks/useHandleErrorMessage";
import TopBar from "@/components/topbar";

const Friends: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();

  const { clear: clearToken, value: token } = useLocalStorage<string>("token", "");
  const { clear: clearId, value: userId } = useLocalStorage<string>("id", "");
  const [user, setUser] = useState<User | null>(null);


  const handleLogout = async (): Promise<void> => {
    try {
        if (!userId) { router.push("/login"); return; }
        await apiService.put(`/users/${userId}/logout`, {});
    } catch (error) {
        console.error("Logout error:", error);
    } finally {
        clearToken();
        clearId();
        router.push("/login");
    }
};



    return (
        
        <div className="dashboard-root">
        <Sidebar />

        <TopBar onLogout={handleLogout} />

        <div className="dashboard-main">
            <div className="dashboard-content">

                {/* Page Title */}
                <div className="bookshelf-card" style={{ paddingBottom: 8 }}>
                    <div className="bookshelf-title">Friends</div>
                    <div className="bookshelf-sort" style={{ marginTop: 0 }}>
                        Your reading companion.
                    </div>
                </div>
        
                        {/* Search + Add Friend */}
                        <div>
                             <input type="text" placeholder="Search by name or username " className="friends-search" />
        
                            <Button type="link" style={{ fontWeight: 500 }}>
                                + Add Friend
                            </Button>
                        </div>
        
        {/* Friend Requests */}
        <div className="bottom-card" style={{ marginTop: 16 }}>
          <div className="bottom-card-title">Friend Requests</div>

          <div className="bookshelf-card" style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 12
          }}>
            <div className="user-row">
              <div className="avatar"
                    style = {{background: "#f4c400"}}>
                JL
              </div>

              <div>
                <div style={{ color: "#b00020", fontSize: 14 }}>Sent you a request</div>
                <div style={{ fontWeight: 600 }}>Jeremy Lin</div>
                <div className="bookshelf-sort">1 mutual friend</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <Button className="bookshelf-session-btn-resume">Accept</Button>
              <Button className="bookshelf-session-btn-pause">Decline</Button>
            </div>
          </div>
        </div>

        {/* Friends */}
        <div className="bottom-card" style={{ marginTop: 16 }}>
          <div className="bottom-card-title">Friends</div>

          {[1, 2, 3, 4].map((_, i) => (
            <div
              key={i}
              className="bookshelf-card"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 12
              }}
            >
              <div className="user-row">
                <div 
                    className="avatar"
                    style= {{ background: ["#2e7d32", "#90a4ae", "#283593", "#c62828"][i] }}>
                  {["JD", "NP", "FF", "VM"][i]}
                </div>

                <div>
                  <div style={{ fontWeight: 600 }}>
                    {["Julie Dao", "Natalia Piegat", "Fraia Pérez Rayon Forsman", "Vanessa Meyer"][i]}
                  </div>
                  <div className="bookshelf-sort">
                    @username • Member since 2026
                  </div>
                  <div style={{ fontSize: 13, color: "#555" }}>
                    Bio
                  </div>
                </div>
              </div>

              <Button className="bookshelf-session-btn-resume">
                View Profile
              </Button>
            </div>
          ))}
        </div>

      </div>
    </div>
    </div>
);
};

export default Friends;