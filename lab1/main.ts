function log(str: string): void {
    console.log(str);
}
function error(err: string): void {
    console.error(err);
}
let fs = require('fs');
var stdin = process.openStdin();
let str, err, path = 'tests/test1.txt';
unification();

stdin.on("data", function (input) {
    input = input.toString().trim();
    if (input == 'exit') {
        stdin.removeAllListeners();
        console.log("Нажмите Enter");
        return;
    }
    path = 'tests/' + input + '.txt';
    unification();
});

function unification(): void {
    try { str = fs.readFileSync(path, 'utf8'); }
    catch (e) {
        error(e);
        return;
    }
    log(str);
    str = str.split(/\s+/).join('');
    log(str);
    let substr = str.match(/constructors=(.+)variables/);
    if (!substr) {
        error('syntax error');
        return;
    }
    log(str.match(/variables=(.+)first/));
}
