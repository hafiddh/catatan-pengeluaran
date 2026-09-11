"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { LoginPage } from "./login";

const googleClientId =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "194218724970-870jicr294njjlmg05e9is2n65sapolj.apps.googleusercontent.com";

export const LoginWithGoogleProvider = () => {
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <LoginPage />
    </GoogleOAuthProvider>
  );
};
