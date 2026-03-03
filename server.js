const http = require("http");

const PORT = process.env.PORT || 3000;
const VERSION = process.env.VERSION || "unknown";

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end(`Running version: ${VERSION}\n`);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("Closed out remaining connections");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Force shutdown");
    process.exit(1);
  }, 10000);
});