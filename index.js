import express from "express";
import { Client, loginUser } from "@mathieuc/tradingview";
import { WebSocketServer } from "ws";

// Initialize Express
const app = express();

// Step 1: Auth and client setup
const user = await loginUser(
  process.env.TV_USER,
  process.env.TV_PASS,
  false
);
const tv = new Client({
  token: user.token,
  signature: user.signature,
});

// Step 2: Historical bars endpoint
app.get("/history", async (req, res) => {
  const { symbol = "FOREXCOM:XAUUSD", timeframe = "1", count = "100" } = req.query;
  const bars = await tv.getBars(symbol, timeframe, {
    countBack: Number(count),
    endTime: Date.now(),
  });
  res.json(bars);
});

// Step 3: WebSocket server for real-time bars
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    const { symbol = "FOREXCOM:XAUUSD", timeframe = "1" } = JSON.parse(msg);
    tv.subscribeBars(symbol, timeframe, (bar) => {
      ws.send(JSON.stringify(bar));
    });
  });
});

// Step 4: Combine HTTP & WS servers
const port = process.env.PORT || 3000;
const server = app.listen(port, () => console.log(`Server running on port ${port}`));

server.on("upgrade", (req, socket, head) =>
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req))
);
