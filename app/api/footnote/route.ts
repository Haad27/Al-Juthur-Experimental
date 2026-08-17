import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const idsParam = searchParams.get("ids");

  if (!id && !idsParam) {
    return NextResponse.json({ error: "Missing id or ids parameter" }, { status: 400 });
  }

  const idsToFetch = idsParam
    ? idsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : [id!];

  try {
    const results: Record<string, string> = {};

    await Promise.all(
      idsToFetch.map(async (fId) => {
        try {
          const res = await fetch(`https://api.quran.com/api/v4/foot_notes/${fId}`, {
            next: { revalidate: 2592000 }, // Cache 30 days
          });
          if (res.ok) {
            const data = await res.json();
            if (data.foot_note?.text) {
              results[fId] = data.foot_note.text;
            }
          }
        } catch (e) {
          console.error(`Failed to fetch footnote ${fId}:`, e);
        }
      })
    );

    return NextResponse.json(
      { success: true, footnotes: results, foot_note: id ? { id, text: results[id] || "" } : undefined },
      {
        headers: {
          "Cache-Control": "public, s-maxage=2592000, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching footnotes in /api/footnote:", error);
    return NextResponse.json({ error: "Failed to fetch footnote" }, { status: 500 });
  }
}
