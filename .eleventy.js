const Modal = require('./src/_includes/components/Modal.js');

module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets"); // if you have static assets
  eleventyConfig.addWatchTarget("src/assets"); // watch for changes in assets
  eleventyConfig.addPassthroughCopy("src/CNAME"); // Make sure to copy CNAME file for custom domains
  eleventyConfig.addShortcode("Modal", Modal); // This is a shortcode/component for bootstrap modals
  eleventyConfig.addWatchTarget("src/_includes/components/Modal.js"); // Watch for changes in the modal component
  eleventyConfig.setBrowserSyncConfig({
    files: './public/static/**/*.css',
  });
return {
    dir: {
      input: "src",
      includes: "_includes",
      output: "public"
    }
  };
};