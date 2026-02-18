import { apiClient } from "./client";
import { Platform } from "react-native";

export const uploadsApi = {
  uploadFile: async (uri: string): Promise<string> => {
    const formData = new FormData();
    const filename = uri.split("/").pop() || "photo.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    formData.append("file", {
      uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri,
      name: filename,
      type,
    } as any);

    const response = await apiClient.post("/uploads", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.url;
  },
};
