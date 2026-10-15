import { buildApp } from "./app.js";
import { createContainer } from "./container.js";
import { env } from "./shared/env.js";

const container = createContainer();
const app = buildApp(container);

app
  .listen({ port: env.port, host: "0.0.0.0" })
  .then(() => app.log.info(`Backend listening on port ${env.port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
