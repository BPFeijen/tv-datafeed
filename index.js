import express from "express";
import TVLib from "@mathieuc/tradingview";
import { WebSocketServer } from "ws";

const { Client, loginUser } = TVLib;

// Express setup
const app = express();

// Log in to TradingView and initialize client
const user = await loginUser(
  process.env.TV_USER,
  process.env.TV_PASS,
  false
);
const tv = new Client({
  token: user.token,
  signature: user.signature,
});

// REST endpoint: historical bars
app.get("/history", async (req, res) => {
  const { symbol = "FOREXCOM:XAUUSD", timeframe = "1", count = "100" } = req.query;
  const bars = await tv.getBars(symbol, timeframe, {
    countBack: Number(count),
    endTime: Date.now(),
  });
  res.json(bars);
});

// WebSocket server: live bar streaming
const wss = new WebSocketServer({ noServer: true });
wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    const { symbol = "FOREXCOM:XAUUSD", timeframe = "1" } = JSON.parse(msg);
    tv.subscribeBars(symbol, timeframe, (bar) => {
      ws.send(JSON.stringify(bar));
    });
  });
});

// Combine HTTP and WebSocket listeners
const port = process.env.PORT || 3000;
const server = app.listen(port, () => console.log(`Server running on port ${port}`));
server.on("upgrade", (req, socket, head) =>
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req))
);
