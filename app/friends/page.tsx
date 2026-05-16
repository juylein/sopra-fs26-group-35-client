"use client";

import React, {useEffect, useRef, useState} from "react";
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

  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const suggestionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        toast.error("User not found");
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
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ position: "relative" }}>
                <input
                    type="text"
                    placeholder="Search by username"
                    className="friends-search"
                    value={searchValue}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setSearchValue(val);
                      if (!val.trim()) { setSuggestions([]); return; }

                      if (suggestionTimeoutRef.current) clearTimeout(suggestionTimeoutRef.current);
                      suggestionTimeoutRef.current = setTimeout(async () => {
                        setSuggestionsLoading(true);
                        try {
                          const results = await apiService.get<User[]>(`/users/search?query=${encodeURIComponent(val.trim())}`);
                          setSuggestions(results ?? []);
                        } catch {
                          setSuggestions([]);
                        } finally {
                          setSuggestionsLoading(false);
                        }
                      }, 400);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        searchUser(searchValue);
                        setSuggestions([]);
                      }
                    }}
                    onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                />

                {/* Suggestions dropdown */}
                {(suggestions.length > 0 || suggestionsLoading) && (
                    <div ref={suggestionsRef} style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "#fff",
                      border: "1px solid #e0e0e0",
                      borderRadius: 8,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      zIndex: 100,
                      marginTop: 4,
                      overflow: "hidden",
                    }}>
                      {suggestionsLoading ? (
                          <div style={{ padding: "10px 14px", color: "#999", fontSize: 14 }}>Searching...</div>
                      ) : (
                          suggestions.map((user) => (
                              <div
                                  key={user.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    padding: "10px 14px",
                                    cursor: "pointer",
                                    transition: "background 0.15s",
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                  onMouseDown={() => {
                                    setSearchValue(user.username ?? "");
                                    setSuggestions([]);
                                    searchUser(user.username ?? "");
                                  }}
                              >
                                <div style={{
                                  width: 32, height: 32, borderRadius: "50%",
                                  background: "#f4c400", display: "flex",
                                  alignItems: "center", justifyContent: "center",
                                  fontWeight: 600, fontSize: 13,
                                }}>
                                  {user.username?.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 14 }}>{user.username}</div>
                                  {user.name && <div style={{ fontSize: 12, color: "#888" }}>{user.name}</div>}
                                </div>
                              </div>
                          ))
                      )}
                    </div>
                )}
              </div>

              <Button type="link" style={{ fontWeight: 500 }} onClick={() => { searchUser(searchValue); setSuggestions([]); }}>
                + Add Friend
              </Button>
            </div>

            {searchMessage && (
                <div style={{ color: "#b00020", marginTop: 6 }}>{searchMessage}</div>
            )}
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