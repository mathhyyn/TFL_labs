function log(str: any): void {
    console.log(str);
}
function error(err: string): void {
    console.error("\x1b[31m%s\x1b[0m", err);
}
function debug(): void {
    if (debugFlag) console.log(U);
}

class constructor {
    name: string;
    fieldsNum: number;
}

class variable {
    name: string;
    count: number;
    terms: term[];
}

class multiEquation {
    vars: variable[];
    terms: term[] = [];
    count: number = 0;
}

class term {
    isVar: boolean;
    var: variable;
    constr: constructor;
    subterms: term[];
    /*findVarInTerm(v: string): boolean {
        this.subterms?.forEach(elem => {
            if (elem.isVar)
                if (elem.var?.name == v) return true;
        });
        return false;
    }*/
}

let fs = require('fs');
var stdin = process.openStdin();
let str, err, path = 'tests/test1.txt';
let constructors, vars: Map<string, variable>, U: multiEquation[] = [];
let debugFlag = true;
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
    if (input == 'debug') {
        debugFlag = !debugFlag;
    } else {
        path = 'tests/' + input + '.txt';
        unification();
        if (err) error(err);
    }
});

function unification(): void {
    err = '';
    constructors = new Map<(string), constructor>([]);
    vars = new Map<(string), variable>([]);
    U = [];
    vars['x0'] = { name: "x0", count: 0 };
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
    pos = 0;
    let second = parseTerm(substr[1]);
    if (err) return;
    console.log(second);

    if (first.constr.name != second.constr.name) {
        err = 'error: имена 1го и 2го терма не совпадают';
        return;
    };
    vars['x0'].terms = [first, second];
    buildU();
    let curU = findS();
    if (!curU) {
        err = 'error: unification is not possible (1)'
        return;
    }
    debug();
}

function buildU(): void {
    Object.values(vars).forEach(v => {
        if (v.count != 0 || v.name == 'x0') U.push({ vars: [v], terms: v.terms, count: v.count });
    });
}

function findS(): any {
    let curU;
    U.forEach(u => {
        console.log(u, u.terms.length > 1, u.count == 0);
        if (u.count == 0 && u.terms.length > 1) { curU = u; return; }
    });
    return curU;
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
        if (constructors[res![1]]) {
            if (constructors[res![1]].fieldsNum.toString() != res![2]) {
                err = 'constructors error: конструкторы с одним именем, но разным количеством переменных';
                return;
            }
        } else
            constructors[res![1]] = { name: res![1], fieldsNum: Number(res![2]) };
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
        vars[elem] = { name: elem, count: 0, terms: [] };
    });
    console.log(vars);
}

function parseTerm(str: string): any {
    console.log(str);
    let term = parseTermStr(str);
    if (str.length != pos) {
        err = 'term syntax error';
        return {};
    }
    return term;
}

function parseTermStr(str: string): any {
    if (!str) {
        err = 'term syntax error';
        return {};
    }
    let t = str[pos++];
    if (vars[t]) {
        vars[t].count++;
        return { isVar: true, var: vars[t] };
    }
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
