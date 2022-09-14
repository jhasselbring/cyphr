const path = require('path');
const argv = require('minimist')(process.argv.slice(2));
const fs = require('fs');
const hexvault = require('hexvault');
const recursive = require("recursive-readdir");
const cliProgress = require('cli-progress');

const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

let total = 0;
let current = 0;
let inProgress = 0;
let list = [];

if (argv.help || argv.h) {
    console.log(`--disqualifier   -d      Sets disqualifying regex.`);
    console.log(`--help           -h      Displays help message.`);
    console.log(`                 -l/-u   Sets mode.`);
    console.log(`                 -r      Enables recursive.`);
    console.log(`--qualifier      -q      Sets qualifying regex.`);
    console.log(`--secret         -s      Sets encoder.`);
    console.log(`--target         -t      Sets target file or directory.`);
} else {
    setup();
}


function setup() {
    if (!argv.target && !argv.t) {
        argv.target = '.';
    } else if (!argv.target) {
        argv.target = argv.t;
    }
    if (!argv.secret && argv.s) argv.secret = argv.s;
    if (!argv.qualifier && argv.q) argv.qualifier = argv.q;
    if (!argv.disqualifier && argv.d) argv.disqualifier = argv.d;

    main();
}

function main() {
    validate();
}
function validate() {
    // --secret is not defined
    if (!argv.secret) {
        // Applying minimal
        argv.secret = 1;
    }

    // -l and -u are either both defined or both undefined
    if (argv.l && argv.u || !argv.l && !argv.u) {
        // Assuming lock
        argv.l = true;
    }

    // Check if given target is valid
    if (!fs.existsSync(argv.target)) {
        console.error('You must provide a valid target.');
        process.exit(1);
    } else {
        let stats = fs.statSync(argv.target);

        if (stats.isFile()) {
            total = 1;
            current = 1;
            bar1.start(1, 0);
            // console.log('[' + current + '/' + total + ']');
            single(argv.target)
        } else if (stats.isDirectory()) {
            multi(argv.target)
        }
    }

}
function single(file) {
    if (argv.l) {
        if (argv.x) {
            console.log('Will lock ' + file);
        } else {
            inProgress++;
            // In case .lock already exist
            if (fs.existsSync(file + '.lock')) {
                fs.unlinkSync(file + '.lock');
            }
            hexvault.lock(file, file + '.lock', argv.secret, () => {
                deleteFile(file, () => {
                    rename(file + '.lock', file, () => {
                        inProgress--;
                    });
                })
            });
        }
    } else {
        if (argv.x) {
            console.log('Will lock ' + file);
        } else {
            inProgress++;
            // In case .lock already exist
            if (fs.existsSync(file + '.lock')) {
                fs.unlinkSync(file + '.lock');
            }
            hexvault.unlock(file, file + '.lock', argv.secret, () => {
                deleteFile(file, () => {
                    rename(file + '.lock', file, () => {
                        inProgress--;
                    });
                })
            });
        }
    }
    current--;
    bar1.update(total - current);
    if (current == 0) bar1.stop();
    // console.log('[' + current + '/' + total + ']');
}
function multi(dir) {
    if (argv.r) {
        recursive(dir, function (err, files) {

            files.forEach(file => {
                pushIfQualified(file);
            })
            total = list.length;
            current = list.length;
            bar1.start(total, 0);
            processAll(list);
        });
    } else {
        fs.readdir(dir, (error, files) => {
            if (error) {
                console.error('Unable to read dir.');
                process.exit(1);
            } else {
                files.forEach(file => {
                    let stats = fs.statSync(file);
                    if (stats.isFile()) {
                        pushIfQualified(file)
                    }
                });
                total = list.length;
                current = list.length;
                bar1.start(total, 0);
                processAll(list);
            }
        });
    }
}
function pushIfQualified(file) {
    if (argv.qualifier) {
        var tester = new RegExp(argv.qualifier);
        let baseName = path.basename(file);
        if (tester.test(baseName)) {
            list.push(file);
            return;
        } else {
            return;
        }
    }
    if (argv.disqualifier) {
        var tester = new RegExp(argv.disqualifier);
        let baseName = path.basename(file);
        if (tester.test(baseName)) {
            return;
        } else {
            list.push(file);
            return;
        }
    }
    list.push(file);
}
function processAll(list) {
    list.forEach(file => {
        checkInProgress(() => {
            single(file);
        })
    })
}
function checkInProgress(cb) {
    if (inProgress >= 5) {
        setTimeout(() => {
            checkInProgress(cb)
        }, 1000);
    } else {
        cb();
    }
}
function deleteFile(file, cb) {
    fs.unlink(file, function (err) {
        if (err) console.error('Drror deleting ' + file, err)
        cb();
    });

}
function rename(from, to, cb) {
    fs.rename(from, to, (err) => {
        if (err) console.log('Error renaming ' + from, err)
        cb();
    })
}