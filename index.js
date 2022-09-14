const path = require('path');
const argv = require('minimist')(process.argv.slice(2));
const fs = require('fs');
const hexvault = require('hexvault');
const recursive = require("recursive-readdir");

let total = 0;
let current = 0;
let inProgress = 0;

(function main() {
    // Validation
    validate();
})()
function validate() {
    // --secret is not defined
    if (!argv.secret) {
        console.error('You must provide a valid secret password.');
        process.exit(1);
    }

    // -l and -u are either both defined or both undefined
    if (argv.l && argv.u || !argv.l && !argv.u) {
        console.error('You must provide a valid intent.');
        process.exit(1);
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
            console.log('[' + current + '/' + total + ']');
            single(argv.target)
        } else if (stats.isDirectory()) {
            multi(argv.target)
        }
    }

}
function single(file) {
    if (argv.l) {
        if (argv.d) {
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
        if (argv.d) {
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
    console.log('[' + current + '/' + total + ']');
}
function multi(dir) {
    if (argv.r) {
        recursive(dir, function (err, files) {
            let list = [];

            files.forEach(file => {
                // Only process if match with RegExp
                if (argv.qualifier) {
                    var tester = new RegExp(argv.qualifier);
                    let baseName = path.basename(file);
                    if (tester.test(baseName)) {
                        list.push(file);
                    }
                } else {
                    list.push(file);
                }
            })
            total = list.length;
            current = list.length;
            list.forEach(file => {
                checkInProgress(() => {
                    single(file);
                })
            })
        });
    } else {
        console.log('not recursive');
    }
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