import express from "express";
import TradingView from "@mathieuc/tradingview";
import { WebSocketServer } from "ws";

const app = express();
const tv = new TradingView();

await tv.login(process.env.TV_USER, process.env.TV_PASS); // optional if needed

app.get("/history", async (req, res) => {
  const { symbol = "FOREXCOM:XAUUSD", timeframe = "1", count = "100" } = req.query;
  const bars = await tv.getBars(symbol, timeframe, {
    countBack: Number(count),
    endTime: Date.now(),
  });
  res.json(bars);
});

const wss = new WebSocketServer({ noServer: true });
wss.on("connection", ws => {
  ws.on("message", msg => {
    const { symbol = "FOREXCOM:XAUUSD", timeframe = "1" } = JSON.parse(msg);
    tv.subscribeBars(symbol, timeframe, bar => {
      ws.send(JSON.stringify(bar));
    });
  });
});

const server = app.listen(process.env.PORT || 3000);
server.on("upgrade", (req, socket, head) =>
  wss.handleUpgrade(req, socket, head, ws =>
    wss.emit("connection", ws, req)
  )
);

console.log("Server running on port", process.env.PORT || 3000);
