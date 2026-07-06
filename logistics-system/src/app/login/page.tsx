import { redirect } from "next/navigation";

// لا تسجيل دخول في النمط الشخصي — أي رابط قديم يعاد توجيهه للوحة التحكم
export default function LoginRedirect() {
  redirect("/dashboard");
}
