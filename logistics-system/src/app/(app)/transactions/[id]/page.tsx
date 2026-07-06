import { getSessionUser } from "@/lib/auth";
import TransactionFile from "@/components/transaction/TransactionFile";

export default async function TransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  return <TransactionFile id={Number(id)} role={user?.role ?? "VIEWER"} />;
}
