"use client";

import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Button, Form, Input, Select } from "antd";

const GENRES = [
    "Fantasy", "Science Fiction", "Mystery", "Thriller", "Romance",
    "Historical Fiction", "Horror", "Biography", "Self-Help",
    "Non-Fiction", "Adventure", "Graphic Novel", "Poetry", "Crime",
];

interface RegisterFormValues {
    name: string;
    username: string;
    password: string;
    bio?: string;
    genres?: string[];
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
                const message = error.message.toLowerCase();

                if (message.includes("username")) {
                    form.setFields([{
                        name: "username",
                        errors: ["This username is already taken."],
                    }]);
                } else if (message.includes("password")) {
                    form.setFields([{
                        name: "password",
                        errors: ["Password does not meet requirements."],
                    }]);
                } else {
                    form.setFields([{
                        name: "username",
                        errors: [`Registration failed: ${error.message}`],
                    }]);
                }

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
                        rules={[
                            { required: true, message: "Please input your username!" },
                            { min: 3, message: "Username must be at least 3 characters." },
                            { max: 20, message: "Username cannot exceed 20 characters." },
                            { pattern: /^[a-zA-Z0-9_]+$/, message: "Only letters, numbers and underscores allowed." },
                        ]}
                    >
                        <Input placeholder="Enter username" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label="Password"
                        rules={[
                            { required: true, message: "Please input your password!" },
                            { min: 8, message: "Password must be at least 8 characters." },
                            { pattern: /[A-Z]/, message: "Password must contain at least one uppercase letter." },
                            { pattern: /[0-9]/, message: "Password must contain at least one number." },
                            { pattern: /[^a-zA-Z0-9]/, message: "Password must contain at least one special character." },
                        ]}
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

                    <Form.Item
                        name="genres"
                        label="Favourite Genres"
                    >
                        <Select
                            mode="multiple"
                            allowClear
                            placeholder="Select your favourite genres..."
                            options={GENRES.map((g) => ({ label: g, value: g }))}
                            maxTagCount="responsive"
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
