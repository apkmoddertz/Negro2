import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { JWT } from "google-auth-library";

// Core constants
const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), "data");
const CREDENTIALS_PATH = path.join(DATA_DIR, "service-account.json");

// Ensure data directory exists
function initStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (error) {
    console.error("Failed to initialize storage folder:", error);
  }
}

initStorage();

// Service account fetch helper
function getServiceAccount(): any | null {
  // 1. Check file storage
  if (fs.existsSync(CREDENTIALS_PATH)) {
    try {
      const content = fs.readFileSync(CREDENTIALS_PATH, "utf-8");
      return JSON.parse(content);
    } catch (e) {
      console.error("Invalid service account JSON on disk:", e);
    }
  }

  // 2. Check environment variable
  if (process.env.FCM_SERVICE_ACCOUNT) {
    try {
      return JSON.parse(process.env.FCM_SERVICE_ACCOUNT);
    } catch (e) {
      console.error("Invalid service account JSON in FCM_SERVICE_ACCOUNT env:", e);
    }
  }

  return null;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API ROUTE: Credentials status
  app.get("/api/status", (req, res) => {
    const sa = getServiceAccount();
    if (!sa) {
      return res.json({ configured: false });
    }
    return res.json({
      configured: true,
      projectId: sa.project_id || sa.projectId,
      clientEmail: sa.client_email || sa.clientEmail,
      type: sa.type
    });
  });

  // API ROUTE: Save service account credentials
  app.post("/api/credentials", (req, res) => {
    try {
      const creds = req.body;
      if (!creds || typeof creds !== "object") {
        return res.status(400).json({ error: "Invalid JSON format" });
      }

      // Check required fields for standard Google service account
      const projectId = creds.project_id || creds.projectId;
      const privateKey = creds.private_key || creds.privateKey;
      const clientEmail = creds.client_email || creds.clientEmail;

      if (!projectId || !privateKey || !clientEmail) {
        return res.status(400).json({
          error: "Service account is missing critical properties (project_id, private_key, or client_email)"
        });
      }

      fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(creds, null, 2), "utf-8");
      return res.json({ success: true, projectId, clientEmail });
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to save credentials: " + error.message });
    }
  });

  // API ROUTE: Delete service account credentials
  app.delete("/api/credentials", (req, res) => {
    try {
      if (fs.existsSync(CREDENTIALS_PATH)) {
        fs.unlinkSync(CREDENTIALS_PATH);
      }
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to delete credentials: " + error.message });
    }
  });

  // API ROUTE: Test connection (retrieve OAuth token)
  app.post("/api/test-connection", async (req, res) => {
    const sa = getServiceAccount();
    if (!sa) {
      return res.status(400).json({ error: "No service account credentials found. Please set them up first." });
    }

    try {
      const client = new JWT({
        email: sa.client_email || sa.clientEmail,
        key: (sa.private_key || sa.privateKey).replace(/\\n/g, "\n"),
        scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
      });

      const response = await client.authorize();
      if (response && response.access_token) {
        return res.json({
          success: true,
          message: "Successfully connected and authorized with Firebase API!",
          expiresAt: new Date(response.expiry_date || Date.now() + 3600000).toISOString()
        });
      } else {
        return res.status(400).json({ error: "No access token was returned from Google authorization." });
      }
    } catch (error: any) {
      console.error("Test connection failed:", error);
      return res.status(500).json({
        error: `Authorization failed: ${error.message || "Unknown error"}. Check if your service account credentials are valid and key/email matches.`
      });
    }
  });

  // API ROUTE: Send notification to FCM v1 API
  app.post("/api/send", async (req, res) => {
    const startTime = Date.now();
    const sa = getServiceAccount();
    if (!sa) {
      return res.status(400).json({ error: "No service account credentials configured on the server." });
    }

    const {
      targetType, // "token" | "topic"
      token,
      topic,
      title,
      body,
      imageUrl,
      customData, // Array<{ key: string, value: string }>
      androidChannelId,
      androidClickAction,
      androidPriority, // 'HIGH' | 'NORMAL'
      replicateInData, // boolean, replicates title, body, image in the data payload for custom background services
    } = req.body;

    if (targetType === "topic") {
      if (!topic || topic.trim() === "") {
        return res.status(400).json({ error: "Topic is required when target type is set to Topic." });
      }
    } else {
      if (!token || token.trim() === "") {
        return res.status(400).json({ error: "Device Registration Token is required." });
      }
    }

    if (!title || title.trim() === "") {
      return res.status(400).json({ error: "Notification Title is required" });
    }

    // Prepare full custom key-value pairs data payload
    const dataObj: Record<string, string> = {};
    
    // If replication is requested (similar to PHP behavior), inject standard keys
    if (replicateInData) {
      dataObj["title"] = title.trim();
      dataObj["body"] = (body || "").trim();
      dataObj["image"] = (imageUrl || "").trim();
      dataObj["source"] = "zyromod"; // Preserved from the user's PHP code default
    }

    if (Array.isArray(customData)) {
      for (const item of customData) {
        if (item.key && item.key.trim() !== "") {
          dataObj[item.key.trim()] = (item.value || "").toString();
        }
      }
    }

    // Build the FCM message payload according to the strict FCM v1 schema
    const message: any = {
      notification: {
        title: title.trim(),
      },
    };

    // Target by token or topic
    if (targetType === "topic") {
      message.topic = topic.trim().replace(/^\/topics\//, ""); // clean up if user added prefix
    } else {
      message.token = token.trim();
    }

    if (body && body.trim() !== "") {
      message.notification.body = body.trim();
    }

    if (imageUrl && imageUrl.trim() !== "") {
      message.notification.image = imageUrl.trim();
    }

    if (Object.keys(dataObj).length > 0) {
      message.data = dataObj;
    }

    // Setup android-specific channel & click_action properties
    const androidConfig: any = {};
    const androidNotification: any = {};

    if (androidPriority === "HIGH") {
      androidConfig.priority = "high";
    } else if (androidPriority === "NORMAL") {
      androidConfig.priority = "normal";
    }

    if (androidChannelId && androidChannelId.trim() !== "") {
      androidNotification.channel_id = androidChannelId.trim();
    }

    if (androidClickAction && androidClickAction.trim() !== "") {
      androidNotification.click_action = androidClickAction.trim();
    }

    // Inject android custom assets or indicators
    androidNotification.sound = "default";
    
    if (Object.keys(androidNotification).length > 0) {
      androidConfig.notification = androidNotification;
    }

    if (Object.keys(androidConfig).length > 0) {
      message.android = androidConfig;
    }

    const fcmPayload = { message };
    const projectId = sa.project_id || sa.projectId;
    const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    let requestSuccess = false;
    let responseStatusText = "";
    let responseBody: any = null;

    try {
      // 1. Get access token
      const authClient = new JWT({
        email: sa.client_email || sa.clientEmail,
        key: (sa.private_key || sa.privateKey).replace(/\\n/g, "\n"),
        scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
      });

      const authRes = await authClient.authorize();
      const accessToken = authRes.access_token;

      if (!accessToken) {
        throw new Error("Failed to retrieve Google Auth API access token");
      }

      // 2. Fire the push request
      const fcmResponse = await fetch(fcmEndpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fcmPayload),
      });

      responseStatusText = `${fcmResponse.status} ${fcmResponse.statusText}`;
      const text = await fcmResponse.text();
      try {
        responseBody = JSON.parse(text);
      } catch (e) {
        responseBody = text;
      }

      if (fcmResponse.ok) {
        requestSuccess = true;
      } else {
        requestSuccess = false;
      }
    } catch (err: any) {
      console.error("FCM Send exception:", err);
      requestSuccess = false;
      responseStatusText = "Network or authorization error";
      responseBody = { error: err.message || "Failed to trigger push notification call" };
    }

    const durationMs = Date.now() - startTime;

    if (requestSuccess) {
      return res.json({
        success: true,
        message: "Notification successfully transmitted to Google FCM v1 services!",
        fcmResponse: responseBody,
        durationMs
      });
    } else {
      return res.status(400).json({
        success: false,
        error: responseStatusText,
        fcmResponse: responseBody,
        durationMs
      });
    }
  });

  // Serve static assets and main SPA in Vite / Production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FCM Notification server online on port ${PORT}`);
  });
}

startServer();
