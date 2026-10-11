import { NextRequest } from 'next/server';
import { headers } from "next/headers";
import { customAuth } from "@/lib/auth";
import { findDocumentByUuid } from "@/models/document";
import { findUserByUuid } from "@/models/user";
import { manageFreeRevision, REVISION_DOCUMENT_TYPES } from "@/models/free-revision";
import { observeRevisionStream } from "@/lib/free-revision-stream";
import { respData, respErr } from '@/lib/resp';
import { difyService, DifyFunctionType } from '@/services/dify';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { inputs, response_mode = 'blocking', user, function_type = 'default' } = body;
    let revision: { uuid: string; user: string; token: string } | undefined;

    if (!inputs || !user) {
      return respErr('缺少必要参数：inputs 和 user');
    }

    const functionType = function_type as DifyFunctionType;

    if (REVISION_DOCUMENT_TYPES[functionType]) {
      if (inputs.whole !== "0") return Response.json({ error: "独立段落重写已停用" }, { status: 410 });
      const { document_uuid, revision_token, ...workflowInputs } = inputs;
      if (typeof document_uuid !== "string" || typeof revision_token !== "string") {
        return Response.json({ error: "请从成稿页使用免费全文优化" }, { status: 400 });
      }
      const session = await customAuth.api.getSession({ headers: await headers() });
      if (!session?.user?.uuid) return Response.json({ error: "Unauthorized" }, { status: 401 });
      const account = await findUserByUuid(session.user.uuid);
      const document = await findDocumentByUuid(document_uuid);
      if (!account || !document || document.user_uuid !== account.uuid ||
          document.document_type !== REVISION_DOCUMENT_TYPES[functionType]) {
        return Response.json({ error: "Document not found" }, { status: 404 });
      }
      // Validate configuration before reserving. No quota function is called here.
      if (!difyService.checkApiKey(functionType)) return respErr("免费优化暂不可用");
      try {
        await manageFreeRevision(document_uuid, account.uuid!, "claim", revision_token);
      } catch {
        return Response.json({ error: "本篇免费优化不可重复使用或暂不可用" }, { status: 409 });
      }
      revision = { uuid: document_uuid, user: account.uuid!, token: revision_token };
      inputs = workflowInputs; // Keep Dify prompt inputs unchanged.
    }

    // 检查 API Key 是否可用
    if (!difyService.checkApiKey(functionType)) {
      return respErr(`功能类型 '${functionType}' 的 API Key 未配置`);
    }

    // 配额已在前端 deduct-quota 接口扣除，此处不再重复扣除

    if (response_mode === 'streaming') {
      // 流式响应 - 直接从Dify API获取流并转发给前端
      // 从环境变量获取API密钥
      const API_KEY_MAP: Record<string, string | undefined> = {
        'recommendation-letter': process.env.DIFY_API_KEY_RECOMMENDATION_LETTER,
        'cover-letter': process.env.DIFY_API_KEY_COVER_LETTER,
        'resume-generator': process.env.DIFY_API_KEY_RESUME_GENERATOR,
        'sop': process.env.DIFY_API_KEY_SOP,
        'personal-statement': process.env.DIFY_API_KEY_PERSONAL_STATEMENT,
        'revise-recommendation-letter': process.env.DIFY_API_KEY_REVISE_RECOMMENDATION_LETTER,
        'revise-sop': process.env.DIFY_API_KEY_REVISE_SOP,
        'revise-personal-statement': process.env.DIFY_API_KEY_REVISE_PERSONAL_STATEMENT,
        'revise-cover-letter': process.env.DIFY_API_KEY_REVISE_COVER_LETTER,
        'default': process.env.DIFY_API_KEY,
      };

      const apiKey = API_KEY_MAP[functionType] || API_KEY_MAP['default'];
      if (!apiKey) {
        return respErr(`功能类型 '${functionType}' 的 API Key 未配置`);
      }

      const baseUrl = process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1';

      // Log request for debugging
      console.log('[Dify API Request]', {
        functionType,
        apiKeyExists: !!apiKey,
        baseUrl,
        inputFields: Object.keys(inputs),
        user
      });

      const difyResponse = await fetch(`${baseUrl}/workflows/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs,
          response_mode: 'streaming',
          user,
        }),
      });

      if (!difyResponse.ok) {
        // Capture the actual error response from Dify
        const errorText = await difyResponse.text();
        let errorBody;
        try {
          errorBody = JSON.parse(errorText);
        } catch (e) {
          errorBody = errorText;
        }

        console.error('[Dify API Error]', {
          status: difyResponse.status,
          statusText: difyResponse.statusText,
          body: errorBody
        });

        // Return detailed error message
        const errorMessage = typeof errorBody === 'object' && errorBody.message
          ? errorBody.message
          : errorText || difyResponse.statusText;

        if (revision) await manageFreeRevision(revision.uuid, revision.user, "release", revision.token);
        return respErr(`Dify API 错误 (${difyResponse.status}): ${errorMessage}`);
      }

      // 直接转发Dify的流式响应
      const responseBody = revision && difyResponse.body
        ? observeRevisionStream(difyResponse.body, async (success) => {
            await manageFreeRevision(revision!.uuid, revision!.user, success ? "ready" : "release", revision!.token);
          })
        : difyResponse.body;
      return new Response(responseBody, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // 阻塞模式
      const result = await difyService.runWorkflow(
        {
          inputs,
          response_mode,
          user,
        },
        functionType
      );

      if (revision) {
        await manageFreeRevision(revision.uuid, revision.user,
          result.data?.status === "succeeded" ? "ready" : "release", revision.token);
      }
      return respData(result);
    }
  } catch (error) {
    console.error('Dify workflow run error:', error);
    return respErr('执行 workflow 失败');
  }
} 