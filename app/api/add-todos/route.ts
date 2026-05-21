import { Client } from "@notionhq/client";
import { NextRequest, NextResponse } from "next/server";

const NOTION_DATABASE_ID = "1ceeb3be4d30804f9a4ac908d2592a71";

export async function POST(req: NextRequest) {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "NOTION_TOKEN が設定されていません" }, { status: 500 });
  }

  const body = await req.json();
  const todos: string[] = body.todos ?? [];
  if (todos.length === 0) {
    return NextResponse.json({ error: "タスクが空です" }, { status: 400 });
  }

  const notion = new Client({ auth: token });

  const results = await Promise.allSettled(
    todos.map((text) =>
      notion.pages.create({
        parent: { database_id: NOTION_DATABASE_ID },
        properties: {
          名前: {
            title: [{ text: { content: text } }],
          },
          局面: {
            select: { name: "Inbox" },
          },
          現況: {
            status: { name: "未着手" },
          },
        },
      })
    )
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    return NextResponse.json(
      { error: `${failed.length}件の追加に失敗しました` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, count: todos.length });
}
