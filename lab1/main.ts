function log(str: string): void {
    console.log(str);
}
function error(err: string): void {
    console.error("\x1b[31m%s\x1b[0m", err);
}

interface constructors {
    name: string;
    fieldsNum: number;
}

interface vars {
    name: string;
    count?: number;
}

interface term {
    isVar?: boolean;
    var?: vars;
    constr?: constructors;
    subterms?: term[];
}

let fs = require('fs');
var stdin = process.openStdin();
let str, err, path = 'tests/test1.txt';
let constructors = new Map<(string), constructors>([]);
let vars = new Map<(string), vars>([]);
let pos = 0; //позиция чтения символа в терме

unification();
if (err) error(err);

stdin.on("data", function (input) {
    input = input.toString().trim();
    if (input == 'exit') {
        stdin.removeAllListeners();
        console.log("Нажмите Enter");
        return;
    }
    path = 'tests/' + input + '.txt';
    unification();
    if (err) error(err);
});

function unification(): void {
    try { str = fs.readFileSync(path, 'utf8'); }
    catch (e) {
        err = e;
        return;
    }
    log(str);
    if (!str.match('First term:') || !str.match('Second term:')) {
        err = 'syntax error';
        return;
    }
    str = str.split(/\s+/).join('');
    let s = str.match(/constructors=(?:.+)variables=(?:.+)Firstterm:(?:.+)Secondterm:(?:.+)/g);//?<term>?<num>
    if (!s) {
        err = 'syntax error';
        return;
    }
    if (s[0] != str) {
        err = 'syntax error';
        return;
    }
    let substr = str.match(/constructors=(.+)variables/);
    parseConstructors(substr[1]);
    if (err) return;
    substr = str.match(/variables=(.+)Firstterm/);
    parseVariables(substr[1]);
    if (err) return;
    substr = str.match(/Firstterm:(.+)Secondterm/);
    pos = 0;
    let first = parseTerm(substr[1]);
    if (err) return;
    console.log(first);

    substr = str.match(/Secondterm:(.+)/);
    pos = 0
    let second = parseTerm(substr[1]);
    if (err) return;
    console.log(second);

    if (first.constr.name != second.constr.name) {
        err = 'error: имена 1го и 2го терма не совпадают';
        return;
    };
}

function parseConstructors(str: string): void {
    let s = str.match(/(?:[A-Za-z]\(\d+\),)*[A-Za-z]\(\d+\)/g);//?<term>?<num>
    if (!s) {
        err = 'constructors syntax error';
        return;
    }
    if (s[0] != str) {
        err = 'constructors syntax error';
        return;
    }
    let constructorsStr = str.split(',');
    constructorsStr.forEach(elem => {
        let res = elem.match(/([A-Za-z])\((\d+)\)/);
        if (constructors[res[1]]) {
            if (constructors[res[1]].fieldsNum.toString() != res[2]) {
                err = 'constructors error: конструкторы с одним именем, но разным количеством переменных';
                return;
            }
        } else
            constructors[res[1]] = { name: res[1], fieldsNum: Number(res[2]) };
    });
    if (err) return;
    console.log(constructors);
}

function parseVariables(str: string): void {
    let s = str.match(/(?:[A-Za-z]\,)*[A-Za-z]/g);//?<term>?<num>
    if (!s) {
        err = 'variables syntax error';
        return;
    }
    if (s[0] != str) {
        err = 'variables syntax error';
        return;
    }
    let varStr = str.split(',');
    varStr.forEach(elem => {
        if (constructors[elem]) {
            err = 'variables syntax error: пространство имен конструкторов и переменных пересекаются';
            return;
        }
        vars[elem] = { name: elem };
    });
    console.log(vars);
}

function parseTerm(str: string): term {
    console.log(str);
    let term = parseTermStr(str);
    if (str.length != pos) {
        err = 'term syntax error';
        return {};
    }
    return term;
}

function parseTermStr(str: string): term {
    if (!str) {
        err = 'term syntax error';
        return {};
    }
    let t = str[pos++];
    console.log(t);
    if (vars[t])
        return { isVar: true, var: vars[t] };
    else if (constructors[t]) {
        let constr = constructors[t];
        let n = constr.fieldsNum;
        if (n == 0)
            return { isVar: false, constr: constr };
        else
            try { //на случай, если строка меньше ожидаемой длины
                if (str[pos++] == '(') {
                    let subterms: term[] = [];
                    for (let i = 0; i < n; i++) {
                        if (i != 0 && str[pos++] != ',') {
                            err = 'term syntax error';
                            return {};
                        }
                        let subterm = parseTermStr(str);
                        console.log(subterm);
                        subterms.push(subterm);
                    }
                    if (str[pos++] != ')') {
                        err = 'term syntax error';
                        return {};
                    }
                    return { isVar: false, constr: constr, subterms: subterms };
                }
            }
            catch (e) {
                err = 'term syntax error';
                return {};
            }
    } else {
        if (t.search(/[A-Za-z]/)) err = 'term syntax error: вхождение в терм необъявленных переменных';
        else err = 'term syntax error';
        return {};
    }
    return {};
}
