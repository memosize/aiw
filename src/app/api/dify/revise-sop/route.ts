import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { customAuth } from "@/lib/auth";
import {
  DifyHttpError,
  DifyService,
  type DifyFunctionType,
  type DifyWorkflowRunResponse,
} from "@/services/dify";
import { checkAndDeductQuota } from "@/lib/check-quota";

function normalizeRevisedContent(content: string) {
  return content.replace(/^\s*\d+\s*\n\s*\n/, "").trimStart();
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function shouldFallbackToSop(error: unknown) {
  const message = getErrorMessage(error);
  return (
    message.includes("invalid_param") &&
    message.includes("No permission to use this model")
  );
}

function isRetryableDifyError(error: unknown): error is DifyHttpError {
  return (
    error instanceof DifyHttpError &&
    [408, 429, 500, 502, 503, 504].includes(error.status)
  );
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWorkflowWithRetry(
  difyService: DifyService,
  request: {
    inputs: Record<string, unknown>;
    response_mode: "blocking";
    user: string;
  },
  functionType: DifyFunctionType,
  options?: {
    attempts?: number;
    timeoutMs?: number;
    retryDelayMs?: number;
  }
): Promise<DifyWorkflowRunResponse> {
  const attempts = options?.attempts ?? 1;
  const timeoutMs = options?.timeoutMs ?? 45000;
  const retryDelayMs = options?.retryDelayMs ?? 1200;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await difyService.runWorkflow(request, functionType, { timeoutMs });
    } catch (error) {
      lastError = error;

      if (!isRetryableDifyError(error) || attempt === attempts) {
        throw error;
      }

      console.warn(
        `[Revise SOP API] ${functionType} workflow attempt ${attempt} failed with status ${error.status}, retrying...`
      );
      await sleep(retryDelayMs);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unknown revise-sop workflow failure");
}

function getUserFacingErrorMessage(error: unknown) {
  if (error instanceof DifyHttpError) {
    if (error.status === 504) {
      return "SOP revision service timed out. Please try again shortly.";
    }

    if (error.status === 502 || error.status === 503) {
      return "SOP revision service is temporarily unavailable. Please try again shortly.";
    }
  }

  return getErrorMessage(error) || "Failed to revise SOP content";
}

function buildSopFallbackInputs(body: Record<string, unknown>) {
  return {
    username:
      typeof body.username === "string" && body.username.trim()
        ? body.username
        : "User",
    language: typeof body.language === "string" ? body.language : "English",
    target: typeof body.target === "string" ? body.target : "",
    education: typeof body.education === "string" ? body.education : "",
    skill: typeof body.skill === "string" ? body.skill : "",
    research: typeof body.research === "string" ? body.research : "",
    workExperience:
      typeof body.workExperience === "string" ? body.workExperience : "",
    plan: typeof body.plan === "string" ? body.plan : "",
    original_context:
      typeof body.original_context === "string" ? body.original_context : "",
    revise_type: typeof body.revise_type === "string" ? body.revise_type : "0",
    style: typeof body.style === "string" ? body.style : "",
    original_word_count:
      typeof body.original_word_count === "string"
        ? body.original_word_count
        : "",
    word_count: typeof body.word_count === "string" ? body.word_count : "",
    detail: typeof body.detail === "string" ? body.detail : "",
    whole: typeof body.whole === "string" ? body.whole : "1",
  };
}

export async function POST(request: Request) {
  try {
    const session = await customAuth.api.getSession({ headers: await headers() });

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    console.log("[Revise SOP API] Request body:", JSON.stringify(body, null, 2));

    const difyService = new DifyService();
    const runRequest = {
      inputs: body,
      response_mode: "blocking" as const,
      user: `revise-sop-${session.user.email}`,
    };

    let result: DifyWorkflowRunResponse;
    let usedFunctionType: DifyFunctionType = "revise-sop";

    try {
      console.log("[Revise SOP API] Calling Dify service with function: revise-sop");
      result = await runWorkflowWithRetry(difyService, runRequest, "revise-sop", {
        attempts: 1,
        timeoutMs: 30000,
      });
    } catch (error) {
      if (!shouldFallbackToSop(error)) {
        throw error;
      }

      console.warn(
        "[Revise SOP API] revise-sop workflow model is not permitted, retrying with sop workflow"
      );

      usedFunctionType = "sop";
      result = await runWorkflowWithRetry(
        difyService,
        {
          ...runRequest,
          inputs: buildSopFallbackInputs(body),
        },
        "sop",
        {
          attempts: 2,
          timeoutMs: 45000,
          retryDelayMs: 1500,
        }
      );
    }

    console.log(
      "[Revise SOP API] Dify result:",
      JSON.stringify({ usedFunctionType, result }, null, 2)
    );

    const userUuid = (session.user as { uuid?: string; id?: string }).uuid
      || (session.user as { uuid?: string; id?: string }).id;

    if (userUuid) {
      const quotaCheck = await checkAndDeductQuota(userUuid, "revise-sop");
      if (!quotaCheck.ok) {
        return NextResponse.json(
          { code: -1, message: quotaCheck.message || "Insufficient quota" },
          { status: 402 }
        );
      }
    }

    const rawRevisedContent = result.data?.outputs?.text || "";
    const revisedContent = normalizeRevisedContent(rawRevisedContent);
    console.log("[Revise SOP API] Revised content length:", revisedContent.length);

    return NextResponse.json({
      success: true,
      content: revisedContent,
    });
  } catch (error) {
    console.error("[Revise SOP API] Error details:", error);
    console.error(
      "[Revise SOP API] Error stack:",
      error instanceof Error ? error.stack : "No stack"
    );

    return NextResponse.json(
      { error: getUserFacingErrorMessage(error) },
      { status: 502 }
    );
  }
}
