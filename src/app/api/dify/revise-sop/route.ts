// Paragraph-only endpoint retired. Full revision uses /workflows/run.
export async function POST() {
  return Response.json({ error: "独立段落重写已停用，请使用成稿页的免费全文优化。" }, { status: 410 });
}
