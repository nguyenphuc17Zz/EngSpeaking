import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { SavedYouTubeItem } from "@/types/shadowing";

const DATA_DIR = path.join(process.cwd(), "data");
const LIBRARY_FILE = path.join(DATA_DIR, "shadowing_library.json");

function ensureFileExists(): SavedYouTubeItem[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(LIBRARY_FILE)) {
      fs.writeFileSync(LIBRARY_FILE, JSON.stringify([], null, 2), "utf-8");
      return [];
    }

    const content = fs.readFileSync(LIBRARY_FILE, "utf-8");
    return JSON.parse(content || "[]");
  } catch {
    return [];
  }
}

function writeLibrary(items: SavedYouTubeItem[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LIBRARY_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch {}
}

export async function GET() {
  const items = ensureFileExists();
  return NextResponse.json({
    success: true,
    items,
    total: items.length,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { item } = body as { item: SavedYouTubeItem };

    if (!item || !item.youtubeId) {
      return NextResponse.json({ error: "Thông tin video không hợp lệ." }, { status: 400 });
    }

    const currentItems = ensureFileExists();
    const existingIndex = currentItems.findIndex((i) => i.youtubeId === item.youtubeId);

    const newItem: SavedYouTubeItem = {
      ...item,
      id: item.id || `yt_${item.youtubeId}`,
      savedAt: item.savedAt || new Date().toISOString(),
      favorite: item.favorite ?? false,
      segmentsCount: item.segments?.length || 0,
    };

    if (existingIndex >= 0) {
      currentItems[existingIndex] = {
        ...currentItems[existingIndex],
        ...newItem,
        favorite: item.favorite ?? currentItems[existingIndex].favorite,
      };
    } else {
      currentItems.unshift(newItem);
    }

    writeLibrary(currentItems);

    return NextResponse.json({
      success: true,
      item: newItem,
      items: currentItems,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: "Lỗi lưu thư viện: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { youtubeId, favorite } = body as { youtubeId: string; favorite: boolean };

    const currentItems = ensureFileExists();
    const item = currentItems.find((i) => i.youtubeId === youtubeId);

    if (!item) {
      return NextResponse.json({ error: "Không tìm thấy video trong thư viện." }, { status: 404 });
    }

    item.favorite = favorite;
    writeLibrary(currentItems);

    return NextResponse.json({
      success: true,
      item,
      items: currentItems,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: "Lỗi cập nhật: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const youtubeId = searchParams.get("youtubeId");
    const id = searchParams.get("id");

    if (!youtubeId && !id) {
      return NextResponse.json({ error: "Thiếu ID video cần xóa." }, { status: 400 });
    }

    let currentItems = ensureFileExists();
    currentItems = currentItems.filter((i) => (youtubeId ? i.youtubeId !== youtubeId : i.id !== id));

    writeLibrary(currentItems);

    return NextResponse.json({
      success: true,
      items: currentItems,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: "Lỗi xóa video: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
