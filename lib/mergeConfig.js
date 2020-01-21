const requiredFields = ["id", "password", "store"];

module.exports = function mergeConfig(config) {
  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`config error - the ${field} field is required`);
    }
  }

  return {
    ...config,
    ignore: [].concat(config.ignore || [])
  };
};
