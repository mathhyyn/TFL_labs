function log(str: string): void {
    console.log(str);
}
function error(err: string): void {
    console.error("\x1b[31m%s\x1b[0m", err);
}

interface constructors {
    name: string;
    fields: number;
}

let fs = require('fs');
var stdin = process.openStdin();
let str, err, path = 'tests/test1.txt';
let constructors = new Map<(string), constructors>([]);

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
    if (!str.match('First term:') || !str.match('Second term:')) {
        error('syntax error');
        return;
    }
    str = str.split(/\s+/).join('');
    let substr = str.match(/constructors=(.+)variables/);
    if (!substr) {
        error('syntax error');
        return;
    }
    parseConstructors(substr[1]);
    /*log(str.match(/variables=(.+)Firstterm/));
    log(str.match(/Firstterm:(.+)Secondterm/));
    log(str.match(/Secondterm:(.+)/));*/
}

function parseConstructors(str: string): void {
    let s = str.match(/(?:([A-Za-z])\((\d)\),)*([A-Za-z])\((\d)\)/g);//?<term>?<num>
    if (s[0] != str) {
        error('constructors syntax error');
        return;
    }
    let termsStr = str.split(',');
    termsStr.forEach(elem => {
        let res = elem.match(/([A-Za-z])\((\d)\)/);
        if (constructors[res[1]]) {
            if (constructors[res[1]].fields.toString() != res[2]) {
                err = 'constructors error: конструкторы с одним именем, но разным количеством переменных';
                error(err);
                return;
            }
        } else
            constructors[res[1]] = { name: res[1], fields: Number(res[2]) };
    });
    if (err) return;
    console.log(constructors);
}
