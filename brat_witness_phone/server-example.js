const http = require("http");

const PORT = process.env.PORT || 8787;

// Example only:
// - API key lives only on the server, for example in process.env.OPENAI_API_KEY.
// - Frontend never stores or receives the API key.
// - Later this is where OpenAI API integration should be connected.
const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/echo") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 32_000) req.destroy();
    });

    req.on("end", () => {
      const payload = safeJson(body);
      const echoPayload = {
        userRequest: payload.userRequest || "",
        selectedMemory: Array.isArray(payload.selectedMemory) ? payload.selectedMemory : [],
        taskType: payload.taskType || "echo",
        privacyNote: payload.privacyNote || "selected context only",
      };

      // TODO: call OpenAI API here with process.env.OPENAI_API_KEY.
      // Never move this key into app.js, localStorage, manifest, or any frontend file.
      const response = {
        provider: "Echo GPT server example",
        mode: "mock",
        receivedOnly: Object.keys(echoPayload),
        answer: "Echo server mock ready. Podłącz tutaj prawdziwe API.",
      };

      sendJson(res, 200, response);
    });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`Echo GPT server example listening on http://localhost:${PORT}`);
});

function safeJson(value) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}
