// Dify API 服务模块
export interface DifyWorkflowRunRequest {
  inputs: Record<string, any>;
  response_mode: 'streaming' | 'blocking';
  user: string;
}

export class DifyHttpError extends Error {
  status: number;
  responseText: string;

  constructor(status: number, responseText: string) {
    super(`HTTP error! status: ${status}, message: ${responseText}`);
    this.name = 'DifyHttpError';
    this.status = status;
    this.responseText = responseText;
  }
}

export interface DifyWorkflowRunResponse {
  workflow_run_id: string;
  task_id: string;
  data: {
    id: string;
    workflow_id: string;
    status: string;
    outputs?: any;
    error?: string;
    elapsed_time?: number;
    total_tokens?: number;
    total_steps?: number;
    created_at: number;
    finished_at?: number;
  };
}

export interface DifyFileUploadRequest {
  file: File;
  user: string;
  type?: string;
}

export interface DifyFileUploadResponse {
  id: string;
  name: string;
  size: number;
  extension: string;
  mime_type: string;
  created_by: string;
  created_at: number;
}

export interface DifyWorkflowStopRequest {
  user: string;
}

export interface DifyWorkflowLogsQuery {
  keyword?: string;
  status?: 'succeeded' | 'failed' | 'stopped';
  page?: number;
  limit?: number;
  created_by_end_user_session_id?: string;
  created_by_account?: string;
}

// 功能类型定义
export type DifyFunctionType = 'recommendation-letter' | 'cover-letter' | 'resume-generator' | 'revise-recommendation-letter' | 'sop' | 'revise-sop' | 'personal-statement' | 'revise-personal-statement' | 'revise-cover-letter' | 'default';

// API Key 配置映射
const API_KEY_MAP: Record<DifyFunctionType, string> = {
  'recommendation-letter': process.env.DIFY_API_KEY_RECOMMENDATION_LETTER || '',
  'cover-letter': process.env.DIFY_API_KEY_COVER_LETTER || '',
  'resume-generator': process.env.DIFY_API_KEY_RESUME_GENERATOR || '',
  'revise-recommendation-letter': process.env.DIFY_API_KEY_REVISE_RECOMMENDATION_LETTER || '',
  'sop': process.env.DIFY_API_KEY_SOP || '',
  'revise-sop': process.env.DIFY_API_KEY_REVISE_SOP || '',
  'personal-statement': process.env.DIFY_API_KEY_PERSONAL_STATEMENT || '',
  'revise-personal-statement': process.env.DIFY_API_KEY_REVISE_PERSONAL_STATEMENT || '',
  'revise-cover-letter': process.env.DIFY_API_KEY_REVISE_COVER_LETTER || '',
  'default': process.env.DIFY_API_KEY || '',
};

export class DifyService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1';
  }

  private getApiKey(functionType: DifyFunctionType = 'default'): string {
    const apiKey = API_KEY_MAP[functionType] || API_KEY_MAP['default'];
    
    console.log(`[DifyService] Getting API key for function type: ${functionType}`);
    console.log(`[DifyService] API key exists: ${!!apiKey}`);
    
    if (!apiKey) {
      throw new Error(`DIFY_API_KEY for function type '${functionType}' is not configured`);
    }
    
    return apiKey;
  }

  private getHeaders(functionType: DifyFunctionType = 'default'): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.getApiKey(functionType)}`,
      'Content-Type': 'application/json',
    };
  }

  private getMultipartHeaders(functionType: DifyFunctionType = 'default'): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.getApiKey(functionType)}`,
    };
  }

  /**
   * 执行 workflow
   */
  async runWorkflow(
    request: DifyWorkflowRunRequest, 
    functionType: DifyFunctionType = 'default',
    options?: { timeoutMs?: number }
  ): Promise<DifyWorkflowRunResponse> {
    try {
      console.log(`[DifyService] Running workflow for function: ${functionType}`);
      console.log(`[DifyService] Request:`, JSON.stringify(request, null, 2));
      console.log(`[DifyService] Base URL: ${this.baseUrl}`);
      
      const headers = this.getHeaders(functionType);
      console.log(`[DifyService] Headers (without Bearer token):`, {
        ...headers,
        Authorization: headers.Authorization ? 'Bearer [HIDDEN]' : undefined
      });
      
      const timeoutMs = options?.timeoutMs ?? 45000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;

      try {
        response = await fetch(`${this.baseUrl}/workflows/run`, {
          method: 'POST',
          headers,
          body: JSON.stringify(request),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      console.log(`[DifyService] Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DifyService] Error response: ${errorText}`);
        throw new DifyHttpError(response.status, errorText);
      }

      const result = await response.json();
      console.log(`[DifyService] Success response:`, JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutMs = options?.timeoutMs ?? 45000;
        const timeoutError = new DifyHttpError(
          504,
          `Dify request timed out after ${timeoutMs}ms`
        );
        console.error('[DifyService] Dify run workflow timeout:', timeoutError);
        throw timeoutError;
      }

      console.error('[DifyService] Dify run workflow error:', error);
      throw error;
    }
  }

  /**
   * 执行 workflow (流式模式)
   */
  async runWorkflowStreaming(
    request: DifyWorkflowRunRequest,
    onChunk: (chunk: any) => void,
    functionType: DifyFunctionType = 'default'
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/workflows/run`, {
        method: 'POST',
        headers: this.getHeaders(functionType),
        body: JSON.stringify({
          ...request,
          response_mode: 'streaming',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              onChunk(data);
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      console.error('Dify run workflow streaming error:', error);
      throw error;
    }
  }

  /**
   * 获取 workflow 执行情况
   */
  async getWorkflowRun(
    workflowRunId: string,
    functionType: DifyFunctionType = 'default'
  ): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/workflows/run/${workflowRunId}`, {
        method: 'GET',
        headers: this.getHeaders(functionType),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Dify get workflow run error:', error);
      throw error;
    }
  }

  /**
   * 停止 workflow 执行
   */
  async stopWorkflow(
    taskId: string, 
    request: DifyWorkflowStopRequest,
    functionType: DifyFunctionType = 'default'
  ): Promise<{ result: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/workflows/tasks/${taskId}/stop`, {
        method: 'POST',
        headers: this.getHeaders(functionType),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Dify stop workflow error:', error);
      throw error;
    }
  }

  /**
   * 上传文件
   */
  async uploadFile(
    file: File, 
    user: string, 
    type?: string,
    functionType: DifyFunctionType = 'default'
  ): Promise<DifyFileUploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user', user);
      if (type) {
        formData.append('type', type);
      }

      const response = await fetch(`${this.baseUrl}/files/upload`, {
        method: 'POST',
        headers: this.getMultipartHeaders(functionType),
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Dify upload file error:', error);
      throw error;
    }
  }

  /**
   * 获取 workflow 日志
   */
  async getWorkflowLogs(
    query?: DifyWorkflowLogsQuery,
    functionType: DifyFunctionType = 'default'
  ): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (query) {
        Object.entries(query).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, value.toString());
          }
        });
      }

      const url = `${this.baseUrl}/workflows/logs${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(functionType),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Dify get workflow logs error:', error);
      throw error;
    }
  }

  /**
   * 检查指定功能类型的 API Key 是否可用
   */
  checkApiKey(functionType: DifyFunctionType): boolean {
    try {
      const apiKey = this.getApiKey(functionType);
      return !!apiKey;
    } catch {
      return false;
    }
  }

  /**
   * 获取所有已配置的功能类型
   */
  getAvailableFunctionTypes(): DifyFunctionType[] {
    return Object.keys(API_KEY_MAP).filter(key => {
      try {
        return this.checkApiKey(key as DifyFunctionType);
      } catch {
        return false;
      }
    }) as DifyFunctionType[];
  }
}

export const difyService = new DifyService(); 
