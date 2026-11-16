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
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function signUp(formData: FormData) {
  const realName = formValue(formData, "real_name");
  const username = formValue(formData, "username").toLowerCase();
  const email = formValue(formData, "email").toLowerCase();
  const phoneNumber = formValue(formData, "phone_number");
  const password = String(formData.get("password") ?? "");

  if (!realName || !/^[a-z0-9_]{3,24}$/.test(username) || (!email && !phoneNumber) || password.length < 8) {
    errorRedirect("/signup", "Enter your name, a valid username, one contact method, and a password of at least 8 characters.");
  }
  if (phoneNumber && !/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
    errorRedirect("/signup", "Use an international phone number, such as +14155550123.");
  }

  const supabase = await createSupabaseServerClient();
  const credentials = email
    ? { email, password }
    : { phone: phoneNumber, password };
  const { error } = await supabase.auth.signUp({
    ...credentials,
    options: { data: { real_name: realName, username, email: email || null, phone_number: phoneNumber || null } },
  });
  if (error) errorRedirect("/signup", error.message);
  redirect("/login?message=Check your email or phone for a confirmation code.");
}

export async function signIn(formData: FormData) {
  const identifier = formValue(formData, "identifier");
  const password = String(formData.get("password") ?? "");
  if (!identifier || !password) errorRedirect("/login", "Enter your username, email or phone number and password.");

  const admin = createSupabaseAdminClient();
  const profileQuery = admin.from("users").select("id");
  const lookup = identifier.includes("@")
    ? profileQuery.eq("email", identifier.toLowerCase())
    : /^\+[1-9]\d{7,14}$/.test(identifier)
      ? profileQuery.eq("phone_number", identifier)
      : profileQuery.eq("username", identifier.toLowerCase());
  const { data: profile, error: lookupError } = await lookup.maybeSingle();
  if (lookupError) throw new Error(`Could not resolve login identifier: ${lookupError.message}`);

  let loginIdentifier = "";
  if (profile) {
    const { data: authData, error: authError } = await admin.auth.admin.getUserById(profile.id);
    if (authError) throw new Error(`Could not resolve account credentials: ${authError.message}`);
    loginIdentifier = authData.user.email || authData.user.phone || "";
  } else if (identifier.includes("@") || /^\+[1-9]\d{7,14}$/.test(identifier)) {
    loginIdentifier = identifier;
  }
  if (!loginIdentifier) errorRedirect("/login", "Incorrect identifier or password.");

  const supabase = await createSupabaseServerClient();
  const credentials = loginIdentifier.includes("@")
    ? { email: loginIdentifier, password }
    : { phone: loginIdentifier, password };
  const { error } = await supabase.auth.signInWithPassword(credentials);
  if (error) errorRedirect("/login", "Incorrect identifier or password.");
  redirect("/dashboard");
}

export async function updateProfile(formData: FormData) {
  const realName = formValue(formData, "real_name");
  const username = formValue(formData, "username").toLowerCase();
  if (!realName || !/^[a-z0-9_]{3,24}$/.test(username)) {
    errorRedirect("/profile", "Enter your name and a username with 3–24 letters, numbers or underscores.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError && !isAuthSessionMissingError(authError)) throw new Error(`Could not verify session: ${authError.message}`);
  if (!user) redirect("/login");

  const { error } = await supabase.from("users").update({ real_name: realName, username }).eq("id", user.id);
  if (error?.code === "23505") errorRedirect("/profile", "That username is already taken.");
  if (error) throw new Error(`Could not update profile: ${error.message}`);
  redirect("/profile?message=Profile updated.");
}

export async function startRecovery(formData: FormData) {
  const realName = formValue(formData, "real_name");
  const identifier = formValue(formData, "identifier");
  const isEmail = identifier.includes("@");
  if (!realName || !identifier || (!isEmail && !/^\+[1-9]\d{7,14}$/.test(identifier))) {
    errorRedirect("/forgot-password", "Enter your real name and a valid email address or international phone number.");
  }

  const admin = createSupabaseAdminClient();
  const lookup = admin.from("users").select("id").eq("real_name", realName);
  const { data, error } = await (isEmail ? lookup.eq("email", identifier.toLowerCase()) : lookup.eq("phone_number", identifier)).maybeSingle();
  if (error) throw new Error(`Could not verify account details: ${error.message}`);

  if (data) {
    const { data: authData, error: authError } = await admin.auth.admin.getUserById(data.id);
    if (authError) throw new Error(`Could not resolve recovery destination: ${authError.message}`);
    const supabase = await createSupabaseServerClient();
    if (authData.user.email) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      if (!siteUrl) throw new Error("Set NEXT_PUBLIC_SITE_URL to enable password recovery.");
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(authData.user.email, {
        redirectTo: `${siteUrl.replace(/\/$/, "")}/auth/callback?next=/reset-password`,
      });
      if (resetError) throw new Error(`Could not send password reset: ${resetError.message}`);
      redirect("/forgot-password?sent=check");
    }

    if (!authData.user.phone) throw new Error("This account has no password recovery destination.");
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: authData.user.phone,
      options: { shouldCreateUser: false },
    });
    if (otpError) throw new Error(`Could not send recovery code: ${otpError.message}`);
    const cookieStore = await cookies();
    cookieStore.set("rerack-recovery-phone", authData.user.phone, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    redirect("/forgot-password?step=verify");
  }

  redirect(isEmail ? "/forgot-password?sent=check" : "/forgot-password?step=verify");
}

export async function completePhoneRecovery(formData: FormData) {
  const code = formValue(formData, "code");
  const password = String(formData.get("password") ?? "");
  if (!/^\d{6,8}$/.test(code) || password.length < 8) {
    errorRedirect("/forgot-password?step=verify", "Enter the code and a new password of at least 8 characters.");
  }

  const cookieStore = await cookies();
  const phone = cookieStore.get("rerack-recovery-phone")?.value;
  if (!phone) errorRedirect("/forgot-password", "Your recovery session expired. Start again.");

  const supabase = await createSupabaseServerClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({ phone, token: code, type: "sms" });
  if (verifyError) errorRedirect("/forgot-password?step=verify", "That recovery code is invalid or expired.");
  const { error: passwordError } = await supabase.auth.updateUser({ password });
  if (passwordError) throw new Error(`Could not update password: ${passwordError.message}`);

  cookieStore.delete("rerack-recovery-phone");
  redirect("/login?message=Password updated. Sign in with your new password.");
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) errorRedirect("/reset-password", "Use a password of at least 8 characters.");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(`Could not update password: ${error.message}`);
  redirect("/login?message=Password updated. Sign in with your new password.");
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`Could not sign out: ${error.message}`);
  redirect("/login");
}
