const {
  createServerlessHandler,
} = require("../api/dist/services/serverless.js");
const {
  IdentityServiceModule,
} = require("../api/dist/services/identity.module.js");

module.exports = createServerlessHandler(IdentityServiceModule, "identity");
