const {
  createServerlessHandler,
} = require("../api/dist/services/serverless.js");
const {
  AcademicServiceModule,
} = require("../api/dist/services/academic.module.js");

module.exports = createServerlessHandler(AcademicServiceModule, "academic");
