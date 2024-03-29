const fs = require('fs');
const path = require('path');
const { lock, unlock } = require('cyphr-locker');

const recursive = require("recursive-readdir");
let { total, current, inProgress, list, loadingBar } = require("./state.js");
let argv;
let ext = '.cyphr3';

function etlParams(params) {
    argv = params;
    if (!argv.disqualifier && argv.d) argv.disqualifier = argv.d;
    if (!argv.parallels && argv.p) argv.parallels = argv.p;
    if (!argv.parallels) argv.parallels = 1;
    if (!argv.qualifier && argv.q) argv.qualifier = argv.q;
    if (!argv.secret && argv.s) argv.secret = argv.s;
    if (!argv.secret) argv.secret = 1;
    if (!argv.target && argv.t) argv.target = argv.t;

    // -l and -u are either both defined or both undefined
    if (argv.l && argv.u || !argv.l && !argv.u) {
        // Assuming lock
        argv.l = true;
    }
    return argv;
}
function setup(params) {
    // Check if given target is valid
    if (!fs.existsSync(argv.target)) {
        console.error('You must provide a valid target.');
        process.exit(1);
    }
    return argv;
}
function deleteFile(file, cb) {
    fs.unlink(file, function (err) {
        if (err) console.error('Drror deleting ' + file, err);
        cb();
    });

}
function rename(from, to, cb) {
    fs.rename(from, to, (err) => {
        if (err) console.log('Error renaming ' + from, err);
        cb();
    })
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
function checkInProgress(cb) {
    if (inProgress >= parseInt(argv.parallels)) {
        setTimeout(() => {
            checkInProgress(cb)
        }, 100);
    } else {
        cb();
    }
}
function processAll(list) {
    list.forEach(file => {
        checkInProgress(() => {
            single(file);
        })
    })
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
function getTotalSize() {
    list.forEach(file => {
        let size = fs.statSync(file).size;
        total = total + size
    });
}
function multi(dir) {
    if (argv.r) {
        recursive(dir, function (err, files) {

            files.forEach(file => {
                pushIfQualified(file);
            })
            
            getTotalSize();
            current = 0;
            loadingBar.start(total, 0);
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
                getTotalSize();
                current = 0;
                loadingBar.start(total, 0);
                processAll(list);
            }
        });
    }
}
function updateProgress(chunk) {
    current = current + chunk.length;
    loadingBar.update(current);
    if (current == total) {
        loadingBar.stop();
    }
    return chunk
}
function single(file) {
    if (argv.l) {
        if (argv.x) {
            console.log('Will lock ' + file);
        } else {
            inProgress++;
            // In case .lock already exist
            if (fs.existsSync(file + ext)) {
                fs.unlinkSync(file + ext);
            }
            lock(file, file + ext, argv.secret, updateProgress)
                .then(result => {
                    if (!argv.k) {
                        deleteFile(file, () => {
                            rename(file + ext, file, () => {
                                inProgress--;
                            });
                        })
                    }
                }).catch(result => {
                    inProgress--;
                });
        }
    } else {
        if (argv.x) {
            console.log('Will lock ' + file);
        } else {
            inProgress++;
            // In case .lock already exist
            if (fs.existsSync(file + ext)) {
                fs.unlinkSync(file + ext);
            }
            unlock(file, file + ext, argv.secret, updateProgress)
                .then(result => {
                    if (!argv.k) {
                        deleteFile(file, () => {
                            rename(file + ext, file, () => {
                                inProgress--;
                            });
                        })
                    }
                }).catch(result => {
                    inProgress--;
                });
        }
    }
}
exports.deleteFile = deleteFile;
exports.rename = rename;
exports.setup = setup;
exports.checkInProgress = checkInProgress;
exports.processAll = processAll;
exports.pushIfQualified = pushIfQualified;
exports.single = single;
exports.multi = multi;
exports.etlParams = etlParams;