import type { Metadata } from "next";
import { App as AntdApp, ConfigProvider, theme } from "antd";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import "@/styles/globals.css";
import { Philosopher } from "next/font/google";

export const metadata: Metadata = {
  title: "Student XX-XXX-XXX",
  description: "Book universe",
};

const philosopher = Philosopher({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-philosopher",
});

export default function RootLayout({
                                     children,
                                   }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="en" className={philosopher.variable}>
      <body>
      <ConfigProvider
          theme={{
            algorithm: theme.defaultAlgorithm,
            token: {
              colorPrimary: "#8B5100",
              borderRadius: 20,
              colorText: "black",
              fontSize: 18,
              colorBgContainer: "#fff",
              fontFamily: "var(--font-philosopher), serif",
            },
            components: {
                Select: {
                    colorTextPlaceholder: "#888888"
                },
              Button: {
                colorPrimary: "#8B5100",
                algorithm: true,
                controlHeight: 38,
              },
              Input: {
                colorBorder: "gray",
                colorTextPlaceholder: "#888888",
                algorithm: false,
              },
              Form: {
                labelColor: "#fff",
                algorithm: theme.defaultAlgorithm,
              },
              Card: {},
            },
          }}
      >
        <AntdRegistry>
          <AntdApp>{children}</AntdApp>
        </AntdRegistry>
      </ConfigProvider>
      </body>
      </html>
  );
}
