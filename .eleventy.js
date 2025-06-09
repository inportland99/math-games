module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets"); // if you have static assets
  eleventyConfig.addWatchTarget("src/assets"); // watch for changes in assets
  eleventyConfig.addPassthroughCopy("src/CNAME"); // Make sure to copy CNAME file for custom domains
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