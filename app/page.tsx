"use client"; // For components that need React hooks and browser APIs, SSR (server side rendering) has to be disabled. Read more here: https://nextjs.org/docs/pages/building-your-application/rendering/server-side-rendering
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "antd";
import { BookOutlined, CodeOutlined, GlobalOutlined } from "@ant-design/icons";
import styles from "@/styles/page.module.css";

export default function Home() {
  const router = useRouter();
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Image
          className={styles.logo}
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />

        <p className="headline">
          Get ready to join the reading universe.
        </p>
        < p className="subtitle">
          Track books, connect with friends,<br/>
          build your reading habit.
        </p>


        <div className="landingContainer">
          <Button
              type="primary"
              className="loginButton"
              variant="solid"
              onClick={() => router.push("/login")}
          >
            Log in
          </Button>
          <Button
            type="primary"
            className="signupButton"
            variant="solid"
            onClick={() => router.push("/register")}
          >
            Sign up
          </Button>
        </div>
      </main>
    </div>
  );
}
