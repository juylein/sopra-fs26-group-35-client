"use client";

import React, { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Input, Button, Select, Form } from "antd";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/topbar";
import { useApi } from "@/hooks/useApi";
import { User } from "@/types/user";
import "@/styles/dashboard.css";
import { toast, ToastContainer } from "react-toastify";

const GENRES = [
  "Fantasy", "Science Fiction", "Mystery", "Thriller", "Romance",
  "Historical Fiction", "Horror", "Biography", "Self-Help",
  "Non-Fiction", "Adventure", "Graphic Novel", "Poetry", "Crime",
];

interface EditProfileFormValues {
    bio: string;
    genres: string[];
    password?: string;
  }

const EditProfile: React.FC = () => {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const apiService = useApi();

  const [form] = Form.useForm<EditProfileFormValues>();

  useEffect(() => {
    const fetchUser = async () => {
      const data = await apiService.get<User>(`/users/${id}`);

      form.setFieldsValue({
        bio: data.bio || "",
        genres: data.genres || [],
        password: "",
      });
    };

    fetchUser();
  }, [apiService, id, form]);

  const onFinish = async (values: EditProfileFormValues) => {
    try {
      await apiService.put(`/users/${id}`, {
        bio: values.bio,
        genres: values.genres,
        password: values.password || undefined,
      });
      toast.success("Your profile was successfully updated!", {
        className: "session-toast", 
        progressClassName: "session-toast-progress",
        onClose: () => router.push(`/users/${id}`),
        autoClose: 900,
      });

    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="dashboard-root" style={{ fontFamily: "inherit" }}>
      <Sidebar />
      <TopBar title="Edit Profile" onLogout={() => {}} />

      <div className="dashboard-main">
        <div className="edit-content"> 
          <div className="db-card" style={{ maxWidth: 700, margin: "0 auto", fontFamily: "inherit"  }}>
            <h2 style={{ marginBottom: 20 }}>Edit your profile</h2>

            <Form<EditProfileFormValues>
              form={form}
              layout="vertical"
              onFinish={onFinish}
              style = {{
                maxWidth: 500
              }}

              initialValues={{
                bio: "",
                genres: [],
                password: "",
              }}
            >

              {/* Bio */}
              <Form.Item name="bio" label="Bio">
                <Input.TextArea
                  placeholder="Tell something about yourself..."
                  rows={4}
                />
              </Form.Item>

              {/* Genres */}
              <Form.Item name="genres" label="Favourite Genres">
                <Select
                  mode="multiple"
                  allowClear
                  placeholder="Select your favourite genres..."
                  options={GENRES.map((g) => ({ label: g, value: g }))}
                />
              </Form.Item>

              {/* Password */}
              <Form.Item name="password" label="New Password"  
              rules={[
                    { min: 8, message: "New password must be at least 8 characters." },
                    { pattern: /[A-Z]/, message: "New password must contain at least one uppercase letter." },
                    { pattern: /[0-9]/, message: "New password must contain at least one number." },
                    { pattern: /[^a-zA-Z0-9]/, message: "New password must contain at least one special character." },
                ]}>
                <Input.Password placeholder="Leave empty if unchanged" style = {{ width: 400}}
                />
              </Form.Item>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 12, marginTop: 24}}>
                <Button type="primary" htmlType="submit">
                  Save Changes
                </Button>
                <Button onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </Form>
          </div>
        </div>
      </div>
      <ToastContainer position="top-center" />
    </div>
    
  );
};

export default EditProfile;