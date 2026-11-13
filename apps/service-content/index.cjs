const {
  createServerlessHandler,
} = require("../api/dist/services/serverless.js");
const {
  ContentServiceModule,
} = require("../api/dist/services/content.module.js");

module.exports = createServerlessHandler(ContentServiceModule, "content");
