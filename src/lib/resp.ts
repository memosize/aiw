import { sanitizeErrorMessage } from "@/lib/sanitize-error-message";

export function respData(data: any) {
  return respJson(0, "ok", data || []);
}

export function respOk() {
  return respJson(0, "ok");
}

export function respErr(message: string, status: number = 200) {
  return Response.json({
    code: -1,
    message: sanitizeErrorMessage(message, "Request failed. Please try again shortly.")
  }, { status });
}

export function respJson(code: number, message: string, data?: any) {
  let json = {
    code: code,
    message: message,
    data: data,
  };
  if (data) {
    json["data"] = data;
  }

  return Response.json(json);
}
