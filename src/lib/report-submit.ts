import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type {
  ReportCategory,
  ReportSeverity,
  ReportSource,
} from "./schemas";
import { storage } from "./firebase";

export type SubmitReportPayload = {
  category: ReportCategory;
  severity: ReportSeverity;
  district?: string;
  description: string;
  latitude: number;
  longitude: number;
  source: ReportSource;
  capturedAt: string;
  photoURL: string;
};

function sanitizeFilename(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

export async function uploadReportPhoto(file: File, userId: string) {
  const safeName = sanitizeFilename(file.name || "photo.jpg");
  const photoRef = ref(storage, `reports/${userId}/${Date.now()}-${safeName}`);
  await uploadBytes(photoRef, file);

  return getDownloadURL(photoRef);
}

export async function createReport(
  idToken: string,
  payload: SubmitReportPayload
): Promise<string> {
  const response = await fetch("/api/reports", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Failed to submit report");
  }

  const body = (await response.json()) as { id?: string };
  return body.id ?? "";
}

export function fileToDataURL(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to encode file"));
    };

    reader.onerror = () => {
      reject(new Error("Unable to encode file"));
    };

    reader.readAsDataURL(file);
  });
}

export function dataURLToFile(dataURL: string, fileName = "queued-report.jpg") {
  const [header, content] = dataURL.split(",");
  if (!header || !content) {
    throw new Error("Invalid image payload");
  }

  const mimeMatch = /data:(.*?);base64/.exec(header);
  const mime = mimeMatch?.[1] ?? "image/jpeg";
  const binary = atob(content);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], fileName, { type: mime });
}
