const argv = require('minimist')(process.argv.slice(2));
if (!argv.target) argv.target = argv.t;
console.log(argv);