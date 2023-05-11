let argv = require('minimist')(process.argv.slice(2));
let pjson = require('./package.json');
const fs = require('fs');
const { showHelp } = require('./inc/help.js');
const { etlParams, setup, single, multi } = require("./inc/actions.js");
let { loadingBar, total } = require("./inc/state.js");

argv = etlParams(argv);
if (argv.help || argv.h) {
    showHelp();
} else if (argv.v) {
    console.log(pjson.version);
} else {
    main();
}

function main() {
    argv = setup(argv);
    let stats = fs.statSync(argv.target);
    if (stats.isFile()) {
        total = stats.size;
        current = 1;
        loadingBar.start(total, 0);
        single(argv.target)
    } else if (stats.isDirectory()) {
        multi(argv.target)
    }
}