"use client";

import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Button, Form, Input } from "antd";

interface RegisterFormValues {
    name: string;
    username: string;
    password: string;
    bio?: string;
}

const Register: React.FC = () => {
    const router = useRouter();
    const apiService = useApi();
    const [form] = Form.useForm();
    const { set: setToken } = useLocalStorage<string>("token","");
    const { set: setUserId } = useLocalStorage<string>("id","");

    const handleRegister = async (values: RegisterFormValues) => {
        try {
            const response = await apiService.post<User>("/users", values);

            if (response.token) setToken(response.token);
            if (response.id) setUserId(String(response.id));

            router.push(`/users/${response.id}`);
        } catch (error) {
            if (error instanceof Error) {
                alert(`Something went wrong during registration: ${error.message}`);
            } else {
                console.error("An unknown error occurred during registration.");
            }
        }
    };

    return (
        <div className="register-page">
            <div className="register-container">
                <Form
                    form={form}
                    name="register"
                    size="large"
                    variant="outlined"
                    onFinish={handleRegister}
                    layout="vertical"
                >
                    <Form.Item
                        name="name"
                        label="Name"
                        rules={[{ required: true, message: "Please input your name!" }]}
                    >
                        <Input placeholder="Enter your name" />
                    </Form.Item>

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

                    <Form.Item
                        name="bio"
                        label="Bio"
                    >
                        <Input.TextArea
                            placeholder="Tell us a little about yourself..."
                            autoSize={{ minRows: 3, maxRows: 6 }}
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" className="register-button">
                            Register
                        </Button>
                    </Form.Item>
                </Form>
            </div>
            <a className="redirect-link" href="/login">Already have an account? Login</a>
        </div>
    );
};

export default Register;
