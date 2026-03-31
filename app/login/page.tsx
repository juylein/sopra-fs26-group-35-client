"use client"; // For components that need React hooks and browser APIs, SSR (server side rendering) has to be disabled. Read more here: https://nextjs.org/docs/pages/building-your-application/rendering/server-side-rendering

import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Button, Form, Input } from "antd";
import { useHandleErrorMessage } from "@/hooks/useHandleErrorMessage";

interface LoginFormValues {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const [form] = Form.useForm();
  const { handleErrorMessage } = useHandleErrorMessage();
  const {
    set: setToken,
  } = useLocalStorage<string>("token", "");

  const { set: setUserId } = useLocalStorage<string>("id", "")

  const handleLogin = async (values: LoginFormValues) => {
    try {
      const response = await apiService.post<User>("/users/login", values);

      if (response.token) {
        setToken(response.token);
      }
      if (response.id) { setUserId(String(response.id))}
      router.push(`/users/${response.id}`);

    }  catch (error) {
      handleErrorMessage(error);
    }
  };

  return (
      <div className="login-page">
        <div className="login-container">
          <Form
              form={form}
              name="login"
              size="large"
              variant="outlined"
              onFinish={handleLogin}
              layout="vertical"
          >
            <Form.Item
                name="username"
                label="Username"
                rules={[{ required: true, message: "Please input your username!" }]}
            >
              <Input placeholder="Enter username" />
            </Form.Item>
            <Form.Item
                name="password"
                label="Password"
                rules={[{ required: true, message: "Please input your password!" }]}
            >
              <Input.Password placeholder="Enter password" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" className="login-button">
                Login
              </Button>
            </Form.Item>
          </Form>
        </div>
        <a className="redirect-link" href="/register">New here? Register now</a>
      </div>
  );
};

export default Login;
