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
import { toast, ToastContainer } from "react-toastify";

interface FriendRequestGetDTO {
  id: number;
  requesterId: number;
  recipientId: number;
  createdAt: Date;
  resolvedAt: Date;
};

const Friends: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const { handleErrorMessage } = useHandleErrorMessage();
  const { clear: clearToken } = useLocalStorage<string>("token", "");
  const { clear: clearId, value: userId } = useLocalStorage<string>("id", "");
  const [friends, serUserFriends] = useState<User[]>([]);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [friendRequests, setFriendRequests] = useState<FriendRequestGetDTO[]>([]);
  const [requesters, setRequesters] = useState<Record<number, User>>({});
  const [isAuthorized, setIsAuthorized] = useState(false);

  const handleLogout = async (): Promise<void> => {
    try {
      if (!userId) { router.push("/login"); return; }
      await apiService.put(`/users/${userId}/logout`, {});
    } catch (error) {
      handleErrorMessage(error);
    } finally {
      clearToken();
      clearId();
      router.push("/login");
    }
  };

  const searchUser = async (username: string) => {
    if (!username.trim()) {
      setSearchMessage("Enter a username");
      return;
    }

    try {
      const friend = await apiService.get<User>(`/users/friends/${username}`);
      if (!friend?.id) {
        toast.error("User not found", {
          className: "session-toast",
          progressClassName: "session-toast-progress",
        });
        return;
      }

      setSearchMessage(null);

      await apiService.post(
        `/users/${friend.id}/friend-requests`,
        {}
      );

      toast.success("Friend request sent!");
    } catch (error) {
      handleErrorMessage(error);
    };
  }

  const acceptFriendRequest = async (id: number) => {
    try {
      await apiService.put(`/friend-requests/${id}/accept`, {});

      setFriendRequests((prev) =>
        prev.filter((r) => r.id !== id)
      );

    } catch (error) {
      handleErrorMessage(error);
    }
  };

  const declineFriendRequest = async (id: number) => {
    try {
      await apiService.put(
        `/friend-requests/${id}/reject?userId=${userId}`,
        {}
      );

      setFriendRequests((prev) => prev.filter((r) => r.id !== id));

    } catch (error) {
      handleErrorMessage(error);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      toast.error("You need to be logged in to access this page.", {
        autoClose: 2000,
        onClose: () => router.push("/login"),
      });
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  useEffect(() => {
    const enrichFriendRequests = async (requests: FriendRequestGetDTO[]) => {
      const results: Record<number, User> = {};
  
      await Promise.all(
        requests.map(async (req) => {
          try {
            const user = await apiService.get<User>(`/users/${req.requesterId}`);
            results[req.requesterId] = user;
          } catch (error) {
            handleErrorMessage(error);
          }
        })
      );
  
      setRequesters(results);
    };

    const fetchUserFriends = async () => {
      if (!userId) return;
  
      try {
        const fetchedUser = await apiService.get<User>(`/users/${userId}`);
        serUserFriends(fetchedUser.friends ?? []);
      } catch (error) {
        handleErrorMessage(error);
      }
    }

    const fetchFriendRequests = async () => {
      if (!userId) return;
  
      try {
        const response = await apiService.get<FriendRequestGetDTO[]>(
          `/users/${userId}/friend-requests/incoming`
        );
  
        setFriendRequests(response);
        await enrichFriendRequests(response);
      } catch (error) {
        handleErrorMessage(error);
      }
    };
    
    fetchFriendRequests();
    fetchUserFriends();
  }, [userId]);

  if (!isAuthorized) {
    return <ToastContainer position="top-center" />;
  }

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
            <input
              type="text"
              placeholder="Search by username"
              className="friends-search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  searchUser(searchValue);
                }
              }}
            />
            {searchMessage && (
              <div style={{ color: "#b00020", marginTop: 6 }}>
                {searchMessage}
              </div>
            )}

            <Button type="link" style={{ fontWeight: 500 }} onClick={() => searchUser(searchValue)}>
              + Add Friend
            </Button>
          </div>

          {/* Friend Requests */}
          <div className="bottom-card" style={{ marginTop: 16 }}>
            <div className="bottom-card-title">Friend Requests</div>

            {friendRequests.length === 0 ? (
              <div style={{ marginTop: 10, color: "#777" }}>
                No friend requests
              </div>
            ) : (
              friendRequests.map((req) => {
                const requester = requesters[req.requesterId];

                return (
                  <div
                    key={`${req.requesterId}-${req.recipientId}`}
                    className="bookshelf-card"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 12,
                    }}
                  >
                    {/* LEFT SIDE */}
                    <div className="user-row">
                      <div
                        className="avatar"
                        style={{
                          background: "#f4c400",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          fontWeight: 600,
                        }}
                      >
                        {requester?.username
                          ? requester.username.substring(0, 2).toUpperCase()
                          : "??"}
                      </div>

                      <div style={{ marginLeft: 10 }}>
                        <div style={{ color: "#b00020", fontSize: 14 }}>
                          Sent you a friend request
                        </div>

                        <div style={{ fontWeight: 600 }}>
                          {requester?.username ?? `User #${req.requesterId}`}
                        </div>

                        <div className="bookshelf-sort">
                          Status: {requester?.status ?? "Loading..."}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT SIDE */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button
                        className="bookshelf-session-btn-resume"
                        onClick={() => acceptFriendRequest(req.id)}
                      >
                        Accept
                      </Button>

                      <Button
                        className="bookshelf-session-btn-pause"
                        onClick={() => declineFriendRequest(req.id)}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Friends */}
          <div className="bottom-card" style={{ marginTop: 16 }}>
            <div className="bottom-card-title">Friends</div>

            {friends.length === 0 ? (
              <div style={{ marginTop: 10, color: "#777" }}>
                No friends yet
              </div>
            ) : (
              friends.map((friend) => (
                <div
                  key={friend.id}
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
                      style={{ background: "#2e7d32" }}
                    >
                      {friend.username?.substring(0, 2).toUpperCase()}
                    </div>

                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {friend.name ?? friend.username}
                      </div>

                      <div className="bookshelf-sort">
                        @{friend.username}
                      </div>

                      <div style={{ fontSize: 13, color: "#555" }}>
                        {friend.bio ?? "No bio"}
                      </div>
                    </div>
                  </div>

                  <Button className="bookshelf-session-btn-resume" onClick={() => router.push(`/users/${friend.id}`)}>
                    View Profile
                  </Button>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
      <ToastContainer position="top-center" />
    </div>

  );
  };

  export default Friends;