"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export function PlayerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      if (!name.trim()) {
        throw new Error("プレイヤー名を入力してください");
      }

      const { error } = await supabase
        .from("players")
        .insert([{ name }]);

      if (error) throw error;

      router.push("/players");
      router.refresh();
    } catch (err) {
      console.error("プレイヤー登録エラー:", err);
      setError("プレイヤーの登録に失敗しました。もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
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
          disabled={isSubmitting}
        />
      </div>

      {error && (
        <div className="text-sm text-red-500">
          {error}
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Link href="/players" passHref>
          <Button variant="outline" disabled={isSubmitting}>キャンセル</Button>
        </Link>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "登録中..." : "登録する"}
        </Button>
      </div>
    </form>
  );
}