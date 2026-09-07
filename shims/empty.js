// Metro never runs this on device. It only satisfies Metro's static
// resolver for the Wayzyy engine's runtime-guarded require('fs'),
// which never executes on Hermes (see lib/wayzyy.ts adapter).
module.exports = {};
