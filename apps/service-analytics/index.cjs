const {
  createServerlessHandler,
} = require("../api/dist/services/serverless.js");
const {
  AnalyticsServiceModule,
} = require("../api/dist/services/analytics.module.js");

module.exports = createServerlessHandler(AnalyticsServiceModule, "analytics");
