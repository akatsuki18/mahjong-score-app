"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export function PlayerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Supabaseにプレイヤーを登録
      const { data, error } = await supabase
        .from("players")
        .insert([{ name }])
        .select();

      if (error) {
        throw error;
      }

      // 登録成功後、プレイヤー一覧ページにリダイレクト
      router.push("/players");
      router.refresh();
    } catch (err) {
      console.error("プレイヤー登録エラー:", err);
      setError("プレイヤーの登録に失敗しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          プレイヤー名
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="プレイヤー名を入力"
          className="w-full p-2 border rounded-md"
          required
          disabled={isLoading}
        />
      </div>

      {error && (
        <div className="text-sm text-red-500">
          {error}
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Link href="/players" passHref>
          <Button variant="outline" disabled={isLoading}>キャンセル</Button>
        </Link>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "登録中..." : "登録する"}
        </Button>
      </div>
    </form>
  );
}