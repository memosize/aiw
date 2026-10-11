// Observe completion without changing Dify bytes, events, or output structure.
export function observeRevisionStream(
  source: ReadableStream<Uint8Array>,
  finish: (successful: boolean) => Promise<void>
): ReadableStream<Uint8Array> {
  const reader = source.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let completed = false;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          // Missing completion is uncertain. Never mark it abandoned or reopen it.
          controller.close();
          return;
        }
        pending += decoder.decode(value, { stream: true });
        const lines = pending.split(/\r?\n/);
        pending = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          let event;
          try { event = JSON.parse(line.slice(5).trim()); } catch { continue; }
          if (!completed && (event.event === "workflow_finished" || event.event === "error")) {
            completed = true;
            await finish(event.event === "workflow_finished" && event.data?.status === "succeeded");
          }
        }
        controller.enqueue(value);
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel(reason) {
      // A disconnect is not proof of workflow failure, and is never abandonment.
      await reader.cancel(reason);
    },
  });
}
