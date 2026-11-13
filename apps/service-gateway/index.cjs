const {
  createServerlessHandler,
} = require("../api/dist/services/serverless.js");
const { AppModule } = require("../api/dist/app.module.js");

module.exports = createServerlessHandler(AppModule, "gateway");
