import { useState, useCallback } from "react";
import { useDify } from "./useDify";
import type { StreamingCallbacks } from "@/services/dify-sse";
import { sanitizeErrorMessage } from "@/lib/sanitize-error-message";

interface ReviseParams {
  revise_type: string;
  style: string;
  original_word_count: string;
  word_count: string;
  detail: string;
  original_context: string;
  whole: string;
  language: string;
  username?: string;
  target?: string;
  education?: string;
  skill?: string;
  research?: string;
  workExperience?: string;
  plan?: string;
}

export function useDifyReviseSOP() {
  const [isRevising, setIsRevising] = useState(false);
  const { runWorkflowStreamingWithCallbacks } = useDify({
    functionType: "revise-sop",
  });

  const runRevision = async (params: ReviseParams) => {
    setIsRevising(true);

    console.log("[SOP Revision] Starting revision with params:", params);

    try {
      const response = await fetch("/api/dify/revise-sop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      console.log("[SOP Revision] Response status:", response.status);
      console.log("[SOP Revision] Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[SOP Revision] API error response:", errorText);

        let parsedMessage = errorText;
        try {
          const parsed = JSON.parse(errorText);
          parsedMessage = parsed?.error || parsed?.message || errorText;
        } catch {
          parsedMessage = errorText;
        }

        throw new Error(
          sanitizeErrorMessage(
            parsedMessage,
            "SOP revision failed. Please try again shortly."
          )
        );
      }

      const data = await response.json();
      console.log("[SOP Revision] Revision response data:", data);
      return data.content || "";
    } catch (error) {
      console.error("[SOP Revision] Revision failed:", error);
      throw error;
    } finally {
      setIsRevising(false);
    }
  };

  const runRevisionStreaming = useCallback(
    async (params: ReviseParams, callbacks: StreamingCallbacks) => {
      setIsRevising(true);

      console.log("[SOP Revision Streaming] Starting revision with params:", params);

      try {
        await runWorkflowStreamingWithCallbacks(
          {
            inputs: params,
            response_mode: "streaming",
            user: `revise-sop-${Date.now()}`,
          },
          {
            ...callbacks,
            onWorkflowStarted: (data) => {
              console.log(
                "[SOP Revision Streaming] Workflow started:",
                data.workflow_run_id
              );
              callbacks.onWorkflowStarted?.(data);
            },
            onError: (msg: string, code?: string) => {
              console.error("[SOP Revision Streaming] Error:", msg, code);
              setIsRevising(false);
              callbacks.onError?.(msg, code);
            },
            onWorkflowFinished: (data) => {
              console.log("[SOP Revision Streaming] Workflow finished");
              setIsRevising(false);
              callbacks.onWorkflowFinished?.(data);
            },
          },
          "revise-sop"
        );
      } catch (error) {
        console.error("[SOP Revision Streaming] Revision failed:", error);
        setIsRevising(false);
        throw error;
      }
    },
    [runWorkflowStreamingWithCallbacks]
  );

  return {
    runRevision,
    runRevisionStreaming,
    isRevising,
  };
}
