"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function errorRedirect(path: string, message: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}

function cookieOptions(maxAge = 600) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}

function isSafeLocalPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/login") || value.startsWith("/signup")) return false;
  try {
    return new URL(value, "https://rerack.invalid").origin === "https://rerack.invalid";
  } catch {
    return false;
  }
}

export async function signUp(formData: FormData) {
  const realName = formValue(formData, "real_name");
  const username = formValue(formData, "username").toLowerCase();
  const email = formValue(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!realName || realName.length > 100 || !/^[a-z0-9_]{3,24}$/.test(username) || !email || password.length < 8) {
    errorRedirect("/signup", "Enter your name, a valid username, email, and password.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { real_name: realName, username, email } },
  });
  if (error) errorRedirect("/signup", error.message);
  redirect("/login?message=Check your email for the account confirmation link or code.");
}

export async function signIn(formData: FormData) {
  const identifier = formValue(formData, "identifier");
  const password = String(formData.get("password") ?? "");
  if (!identifier || !password) errorRedirect("/login", "Enter your username or email and password.");

  const admin = createSupabaseAdminClient();
  const profileQuery = admin.from("users").select("id");
  const lookup = identifier.includes("@")
    ? profileQuery.eq("email", identifier.toLowerCase())
    : profileQuery.eq("username", identifier.toLowerCase());
  const { data: profile, error: lookupError } = await lookup.maybeSingle();
  if (lookupError) throw new Error(`Could not resolve login identifier: ${lookupError.message}`);

  let loginIdentifier = "";
  if (profile) {
    const { data: authData, error: authError } = await admin.auth.admin.getUserById(profile.id);
    if (authError) throw new Error(`Could not resolve account credentials: ${authError.message}`);
    loginIdentifier = authData.user.email || "";
  } else if (identifier.includes("@")) {
    loginIdentifier = identifier;
  }
  if (!loginIdentifier) errorRedirect("/login", "Incorrect identifier or password.");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email: loginIdentifier, password });
  if (error) errorRedirect("/login", "Incorrect identifier or password.");
  const destination = formValue(formData, "next");
  redirect(isSafeLocalPath(destination) ? destination : "/dashboard");
}

export async function updateProfile(formData: FormData) {
  const realName = formValue(formData, "real_name");
  const username = formValue(formData, "username").toLowerCase();
  if (!realName || realName.length > 100 || !/^[a-z0-9_]{3,24}$/.test(username)) {
    errorRedirect("/profile?challenge=profile", "Enter your name and a username with 3–24 letters, numbers or underscores.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError && !isAuthSessionMissingError(authError)) throw new Error(`Could not verify session: ${authError.message}`);
  if (!user) redirect("/login");

  const { error } = await supabase.from("users").update({ real_name: realName, username }).eq("id", user.id);
  if (error?.code === "23505") errorRedirect("/profile?challenge=profile", "That username is already taken.");
  if (error) errorRedirect("/profile?challenge=profile", `Could not update profile: ${error.message}`);
  redirect("/profile?message=Profile updated.");
}

export async function startRecovery(formData: FormData) {
  const realName = formValue(formData, "real_name");
  const identifier = formValue(formData, "identifier");
  if (!realName || !identifier.includes("@") || identifier.length > 254) errorRedirect("/forgot-password", "Enter your real name and a valid email address.");

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("users")
    .select("id")
    .eq("real_name", realName)
    .eq("email", identifier.toLowerCase())
    .maybeSingle();
  if (error) throw new Error(`Could not verify account details: ${error.message}`);

  if (data) {
    const { data: authData, error: authError } = await admin.auth.admin.getUserById(data.id);
    if (authError) throw new Error(`Could not resolve recovery destination: ${authError.message}`);
    const supabase = await createSupabaseServerClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) throw new Error("Set NEXT_PUBLIC_SITE_URL to enable password recovery.");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(authData.user.email ?? identifier.toLowerCase(), {
      redirectTo: `${siteUrl.replace(/\/$/, "")}/auth/callback?next=/reset-password`,
    });
    if (resetError) throw new Error(`Could not send password reset: ${resetError.message}`);
  }

  redirect("/forgot-password?sent=check");
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) errorRedirect("/reset-password", "Use a password of at least 8 characters.");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(`Could not update password: ${error.message}`);
  redirect("/login?message=Password updated. Sign in with your new password.");
}

export async function startPasswordChange() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError && !isAuthSessionMissingError(authError)) throw new Error(`Could not verify session: ${authError.message}`);
  if (!user) redirect("/login");

  if (!user.email) errorRedirect("/profile?challenge=password-form", "This account does not have an email address for verification.");

  const { error } = await supabase.auth.signInWithOtp({
    email: user.email,
    options: { shouldCreateUser: false },
  });
  if (error) errorRedirect("/profile?challenge=password-form", `Could not send a verification code: ${error.message}`);
  const cookieStore = await cookies();
  cookieStore.set("rerack-password-change-email", user.email, cookieOptions());
  redirect("/profile?challenge=password");
}

export async function completePasswordChange(formData: FormData) {
  const code = formValue(formData, "code");
  const password = String(formData.get("new_password") ?? "");
  if (!/^\d{6,8}$/.test(code) || password.length < 8) {
    errorRedirect("/profile?challenge=password", "Enter the email code and a password of at least 8 characters.");
  }

  const cookieStore = await cookies();
  const email = cookieStore.get("rerack-password-change-email")?.value;
  if (!email) errorRedirect("/profile", "Your verification session expired. Start again.");

  const supabase = await createSupabaseServerClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (verifyError) errorRedirect("/profile?challenge=password", "That code is invalid or expired.");
  const { error: passwordError } = await supabase.auth.updateUser({ password });
  if (passwordError) throw new Error(`Could not update password: ${passwordError.message}`);

  cookieStore.delete("rerack-password-change-email");
  redirect("/profile?message=Password updated.");
}

export async function startContactChange(formData: FormData) {
  const currentPassword = String(formData.get("current_password") ?? "");
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError && !isAuthSessionMissingError(authError)) throw new Error(`Could not verify session: ${authError.message}`);
  if (!user) redirect("/login");
  if (!user.email || !currentPassword) errorRedirect("/profile?challenge=contact-form", "Enter your current password to change your email address.");

  const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
  if (reauthError) errorRedirect("/profile?challenge=contact-form", "The current password is incorrect.");

  const email = formValue(formData, "new_email").toLowerCase();
  if (!email || email === user.email || email.length > 254) errorRedirect("/profile?challenge=contact-form", "Enter a different valid email address.");
  const { error } = await supabase.auth.updateUser({ email });
  if (error) errorRedirect("/profile?challenge=contact-form", `Could not start email change: ${error.message}`);

  const cookieStore = await cookies();
  cookieStore.set("rerack-contact-change", email, cookieOptions());
  redirect("/profile?challenge=contact");
}

export async function completeContactChange(formData: FormData) {
  const code = formValue(formData, "code");
  if (!/^\d{6,8}$/.test(code)) errorRedirect("/profile?challenge=contact", "Enter the verification code.");
  const cookieStore = await cookies();
  const email = cookieStore.get("rerack-contact-change")?.value;
  if (!email) errorRedirect("/profile", "Your verification session expired. Start the email change again.");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email_change" });
  if (error) errorRedirect("/profile?challenge=contact", "That code is invalid or expired.");
  cookieStore.delete("rerack-contact-change");
  redirect("/profile?message=Account contact updated.");
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`Could not sign out: ${error.message}`);
  redirect("/login");
}

export async function logoutEverywhere() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) throw new Error(`Could not sign out other sessions: ${error.message}`);
  redirect("/login?message=You have been signed out on all devices.");
}
